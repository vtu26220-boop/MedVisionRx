"""Prepare downloaded prescription data. No model training or clinical data claims."""
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import sqlite3
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]


def prepare_names(archive, output):
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix('.building.sqlite3')
    temporary.unlink(missing_ok=True)
    connection = sqlite3.connect(temporary)
    try:
        connection.execute('CREATE TABLE names (normalized TEXT, name TEXT, rxcui TEXT, term_type TEXT, PRIMARY KEY(normalized,rxcui,term_type))')
        with ZipFile(archive) as zipped:
            with zipped.open('rrf/RXNCONSO.RRF') as source:
                batch = []
                for row in csv.reader(io.TextIOWrapper(source, encoding='utf-8'), delimiter='|'):
                    if len(row) < 18 or row[1] != 'ENG' or row[11] != 'RXNORM' or row[16] != 'N':
                        continue
                    name = row[14].strip()
                    if not name:
                        continue
                    batch.append((' '.join(name.split()).casefold(), name, row[0], row[12]))
                    if len(batch) >= 2000:
                        connection.executemany('INSERT OR IGNORE INTO names VALUES (?,?,?,?)', batch)
                        batch.clear()
                connection.executemany('INSERT OR IGNORE INTO names VALUES (?,?,?,?)', batch)
        count = connection.execute('SELECT COUNT(*) FROM names').fetchone()[0]
        connection.commit()
    finally:
        connection.close()
    temporary.replace(output)
    return count


def prepare_handwriting(archive, output):
    output.mkdir(parents=True, exist_ok=True)
    report = {}
    image_hashes = {}
    with ZipFile(archive) as zipped:
        members = set(zipped.namelist())
        for split, labels_name, folder in [('train','Train_Label.csv','Train_Set'), ('test','Test_Labels.csv','Test_Set')]:
            records = []
            skipped = 0
            with zipped.open(labels_name) as labels:
                for row in csv.DictReader(io.TextIOWrapper(labels, encoding='utf-8-sig')):
                    filename, label = row['Images'].strip(), row['Text'].strip()
                    # Only flat image names from this archive are accepted.
                    if Path(filename).name != filename or '/' in filename or '\\' in filename or not filename.lower().endswith('.jpg'):
                        raise ValueError('Unsafe dataset image filename')
                    member = f'{folder}/{filename}'
                    if member not in members:
                        raise ValueError('A label references a missing image')
                    if not label or not any(char.isalnum() for char in label) or '?' in label:
                        skipped += 1
                        continue
                    data = zipped.read(member)
                    digest = hashlib.sha256(data).hexdigest()
                    image_hashes.setdefault(digest, set()).add(split)
                    destination = output / folder / filename
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    destination.write_bytes(data)
                    records.append({'image':f'{folder}/{filename}','text':label,'sha256':digest})
            # Validation is derived only from training; published test stays held out.
            if split == 'train':
                validation_hashes = {r['sha256'] for r in records if int(r['sha256'][:8],16) % 10 == 0}
                partitions = {'validation':[r for r in records if r['sha256'] in validation_hashes], 'train':[r for r in records if r['sha256'] not in validation_hashes]}
            else:
                partitions = {'test':records}
            for name, values in partitions.items():
                (output / f'{name}.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in values),encoding='utf-8')
                report[name] = len(values)
            report[f'{split}_unclear_labels_excluded'] = skipped
        report['train_test_identical_image_hashes'] = sum(len(splits)>1 for splits in image_hashes.values())
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--datasets',type=Path,default=ROOT/'datasets')
    args = parser.parse_args()
    rxnorm = args.datasets/'RxNorm_full_prescribe_11022026.zip'
    handwriting = args.datasets/'RxHandBD.zip'
    counts = {'rxnorm_name_rows':prepare_names(rxnorm,ROOT/'app/models/prescription/rxnorm.sqlite3'), 'handwriting':prepare_handwriting(handwriting,args.datasets/'prepared/rxhandbd')}
    counts['model_trained'] = False
    counts['clinical_information_included'] = False
    (args.datasets/'prepared/report.json').write_text(json.dumps(counts,indent=2),encoding='utf-8')
    print(json.dumps(counts,indent=2))

if __name__ == '__main__':
    main()
