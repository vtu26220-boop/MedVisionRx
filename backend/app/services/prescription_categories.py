"""Sourced category information; not an exact product or patient-specific dose."""


def category_reference(name, strength="", form=""):
    key=' '.join(str(name or '').split()).casefold()
    if key in {'dextrose','glucose'} and strength.replace(' ','') == '5%' and not form:
        return {
            'reference_status':'category_match',
            'generic_name':'Dextrose (glucose); exact product and route not confirmed',
            'uses':['Reference for intravenous 5% dextrose: supplies water and calories. This does not establish the route or indication written in your prescription.'],
            'side_effects':['Intravenous products can cause high blood glucose, fluid or electrolyte imbalance, infusion-site reactions and allergic reactions.'],
            'age_restrictions':{'general':'Intravenous formulations are used in adults and children under clinical supervision. Infants and older adults require particular monitoring; there is no universal self-use age limit.'},
            'precautions':['Intravenous dextrose requires professional administration and monitoring of glucose, fluid balance and electrolytes.'],
            'sources':[{'title':'DailyMed: 5% dextrose injection reference label','url':'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=60b6d7c3-0164-46c9-aa38-b5aa1c31a5d5'}],
            'reference_note':'Related 5% dextrose injection reference, not an exact product match. Route and dose are unconfirmed. Pharmacy searches do not verify product suitability.'
        }
    if strength or form:
        return None
    if key not in {'ors','oral rehydration salts','oral rehydration salt'}:

        return None
    return {
        'reference_status':'category_match',
        'generic_name':'Oral rehydration salts (category; exact ingredients/formulation not identified)',
        'uses':['Replaces water and electrolytes lost through diarrhoea to prevent or treat dehydration. It does not treat the cause of diarrhoea.'],
        'side_effects':['Side effects are uncommon. Contact a clinician about unusual symptoms; this category summary does not establish the safety of an unidentified product.'],
        'age_restrictions':{'general':'ORS is used across age groups. The appropriate product, preparation and amount depend on age and clinical condition; ask a clinician for infants and young children.'},
        'precautions':['Use the water volume printed on the exact packet; formulations differ. Do not add extra salt or sugar.','Seek medical advice for kidney or liver disease, or if fluids cannot be kept down.'],
        'sources':[
            {'title':'WHO: Oral rehydration salts','url':'https://www.who.int/publications/i/item/WHO-FCH-CAH-06.1'},
            {'title':'Medicines for Children: Oral rehydration salts','url':'https://www.medicinesforchildren.org.uk/medicines/oral-rehydration-salts/'}
        ],
        'reference_note':'General ORS category information, not a matched brand or formulation. The prescription dosage and timing remain separate. Pharmacy links search for the category; confirm the exact product with a pharmacist.'
    }
