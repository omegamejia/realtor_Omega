"""
Trade rules: what a particular kind of business must or must not say on its website.

PORTED, NOT REWRITTEN. Every rule below comes from the site seeds' compliance packs
and carries the authority it came from:

    local-service-site-seed/scripts/compliance/packs/{baseline,dental,auto}.mjs
    service-site-seed/scripts/compliance-packs.mjs   (pest, contractor, salon)

Real estate and lending rules live in grader.py, because they are the realtor
seed's Layer 6 and 7 and the Summit grader's lender layer, word for word.

THE RULE THIS FILE IS BUILT AROUND: unchecked is not clean.
  - Never invent a requirement. A checker that fails a page for a rule nobody has
    teaches the owner the checker is wrong.
  - `fail` is for the unambiguous; `warn` is for anything a person has to judge.
  - A state whose rules were not verified gets the federal layer plus an explicit
    "not checked" line. Silence must never read as a pass.

SHAPE OF A PACK
    id, label, applies_to   which --industry values select it
    warn / fail             [(regex, why)]   scanned over each page's main text
    every_page              [(regex, what is missing)]   must appear on every page
    conditional             [{"if_page": regex, "why": ...}]   page says X, so it needs a licence number
    by_state                {"CA": {same keys}}   only for verified states
    verified_states         list, or None when the pack has no state layer
    not_checked             plain sentences, shown under "Not measured"

Python's `re` and JavaScript's agree on everything used here. Flags are applied
by the grader (case-insensitive), so patterns carry none.
"""
from __future__ import annotations

# A licence number with real digits in it. A bare "Licensed" or a [blank] is not one.
LICENCE_NUMBER = r"\b(lic(ense|ence)?\.?\s*(no\.?|number|#)?\s*[:#]?\s*[A-Z]{0,4}[- ]?\d{4,})|\bCSLB\b"

BASELINE = {
    "id": "baseline",
    "label": "Advertising basics (FTC)",
    "applies_to": "*",
    # The superlative and guarantee rules are already in grader.CLAIMS; these are
    # the baseline entries CLAIMS does not cover.
    "warn": [
        (r"\bresults?\s+(are\s+)?not\s+typical\b|\bresults?\s+may\s+vary\b",
         "a disclaimer does not license an unusual result. FTC 16 CFR 255.2(b): state the generally expected result instead"),
        (r"\bfree\s+(inspection|estimate|quote|consultation|diagnostic)s?\b",
         "FTC 16 CFR 251.1: the conditions of a free offer must appear WITH the offer, not in a footnote or on another page"),
    ],
    "not_checked": [
        "Whether a claim on this site is actually true. No script can check that.",
    ],
}

# The handicapped rule is in grader.FH_WARN for real estate; everyone else gets it here.
HANDICAPPED = (r"\bhandicapped\b", "dated and widely read as offensive: use 'accessible', or name the feature")

DENTAL = {
    "id": "dental",
    "label": "Dental advertising",
    "applies_to": ["dentist", "orthodontist"],
    "warn": [
        (r"\b(patient|client)\s+(photo|photograph|picture|story|stories|testimonial)s?\b",
         "a patient photo or story is protected health information; HIPAA 45 CFR 164.508(a)(3) requires written authorization for marketing use"),
        (r"\bspecialist\b",
         "'specialist' is a regulated word for a dentist in most states and usually requires board certification in a recognised specialty"),
    ],
    "verified_states": ["CA", "TX", "FL", "NJ", "NC", "LA"],
    "by_state": {
        "CA": {
            "fail": [(r"\b(painless|pain[- ]free)\b", "CA B&P 1680(l): advertising dentistry as painless is unprofessional conduct")],
            "warn": [
                (r"\bguarantee(d|s)?\b", "CA B&P 1680(l) prohibits advertising a guarantee of any dental service. A fee-refund promise may be allowed; confirm with the board"),
                (r"\b(best|finest|leading|superior|top[- ]rated|#\s?1|number one)\b", "CA B&P 651(b)(6): a superiority claim needs objective scientific substantiation"),
                (r"\b(before\s*(and|&|/)\s*after)\b", "CA B&P 651(b)(3): a before/after must name the procedures, be comparable in pose and lighting, be unretouched, and say the same results may not occur for all patients"),
            ],
            "not_checked": [
                "CA B&P 651(b)(3)(A): whether an image has been retouched. No script can see that.",
                "CA B&P 651(b)(3)(C)(i): whether before and after images match in pose and lighting.",
            ],
        },
        "TX": {
            "fail": [(r"\b(painless|pain[- ]free)\b", "TX 22 TAC 108.57(4): claiming dental work without pain or discomfort is prohibited")],
            "warn": [
                (r"\bguarantee(d|s)?\b", "TX 22 TAC 108.57(7) bans implying a guarantee of success; a fee-refund guarantee is expressly permitted, so check which this is"),
                (r"\b(before\s*(and|&|/)\s*after)\b", "TX 22 TAC 108.57(d): patient photographs need written consent and the words 'Actual results may vary'"),
                (r"\b(specialist|specializing in|specialty)\b", "TX 22 TAC 108.55: a general dentist advertising specific services must show 'General Dentist' after their name"),
            ],
            "not_checked": ["TX 22 TAC 108.55(d): the font size of the 'General Dentist' line. Readable only from rendered CSS."],
        },
        "FL": {
            "every_page": [(r"\b(license|lic\.?)\s*#?\s*[0-9A-Za-z]|\b\d{3}[-. ]?\d{3}[-. ]?\d{4}\b",
                            "Florida dentist identification (FL 64B5-4.002(2): licence number, or the dentist's name with the address and phone on file)")],
            "fail": [
                (r"\b(free|no[- ]cost|complimentary|\$0)\b[\s\S]{0,400}?\b(exam|consultation|cleaning|x[- ]?ray|whitening|screening)\b",
                 "FL 456.062: a free or discounted service ad must carry, in capitals, the 'THE PATIENT AND ANY OTHER PERSON RESPONSIBLE FOR PAYMENT HAS A RIGHT TO REFUSE TO PAY...' statement"),
                (r"\b(best|finest|leading|superior|top[- ]rated|#\s?1|number one|most experienced)\b",
                 "FL 466.019(2)(c): laudatory statements about the dentist are prohibited, with no substantiation exception"),
            ],
            "warn": [
                (r"\b(painless|pain[- ]free)\b", "FL 64B5-4.002(3)(f) uses 'painless' as its worked example of deceptive advertising"),
                (r"\b(specialist|specializing in|specialty)\b", "FL 466.0282(3): a non-recognized area of practice needs an exact capitalised disclosure"),
                (r"\$\s?\d", "FL 64B5-4.003: an advertised fee needs a minimum-fee disclaimer, the period it is in effect, and ADA CDT nomenclature"),
            ],
            "not_checked": ["FL 64B5-4.002(2): whether the address and phone match the ones on file with the Department."],
        },
        "NJ": {
            "fail": [(r"\b(testimonial|what our patients say|patient reviews)\b", "NJ 13:30-6.2 prohibits testimonials attesting to the technical quality or competence of a dental service")],
            "warn": [(r"\b(specialist|specializing in|specialty)\b", "NJ 13:30-6.2: ads must carry the licensee's name and 'General Dentist' or the permitted specialty")],
        },
        "NC": {
            "warn": [(r"\b(specialist|specializing in|specialty)\b", "NC 21 NCAC 16P .0105: 'specialist' requires accredited postdoctoral training or board certification, and the board must be named")],
            "not_checked": ["NC 21 NCAC 16P .0105(g): whether general-dentist service ads say a general dentist provides them."],
        },
        "LA": {
            "every_page": [(r"\b(license|lic\.?)\s*#?\s*[0-9A-Za-z]|\bDDS\b|\bDMD\b",
                            "Louisiana dentist identification (LA 46:XXXIII-301: ads must identify the responsible Louisiana licensed dentist)")],
            "warn": [(r"\b(discount(ed)?|\d+%\s*off|reduced fee)\b", "LA 46:XXXIII-301: an advertised discount must state the true fee it is taken from")],
        },
    },
    "not_checked": [
        "Whether a patient consented to their photo or story being used.",
        "Whether this dentist's credentials permit the word 'specialist'.",
        "Dental board rules in any state other than CA, TX, FL, NJ, NC and LA.",
        "HIPAA compliance of forms and booking tools. Nothing here checks it.",
    ],
}

CONTRACTOR = {
    "id": "contractor",
    "label": "Contractor licence",
    "applies_to": ["contractor", "roofer", "plumber", "electrician", "hvac", "landscaper"],
    "verified_states": ["CA"],
    "by_state": {
        "CA": {
            "every_page": [(LICENCE_NUMBER,
                            "a contractor licence number (Cal. Bus. & Prof. Code 7030.5 requires it in ALL advertising, including a website)")],
        },
    },
    "conditional": [
        {"if_page": r"\b(licensed|insured and licensed|fully licensed)\b",
         "why": "this site says it is licensed but shows no licence number. Many states require the number in advertising and this checklist does not know which yours does. (Practice, not a verified requirement outside California.)"},
    ],
    "not_checked": ["Contractor advertising rules in states other than California."],
}

PEST = {
    "id": "pest",
    "label": "Pest control claims",
    "applies_to": ["pest-control"],
    "warn": [
        (r"\b(completely|totally|perfectly|entirely)?\s*safe\s+(for|around)\s+(kids|children|pets|your\s+family|the\s+whole\s+family)\b",
         "a safety claim about a registered pesticide. FIFRA 12(a)(1)(B) and 40 CFR 156.10(a)(5)(ix); EPA treats 'safe' as misleading even qualified. Describe the instruction instead"),
        (r"\b(non[-\s]?toxic|harmless|chemical[-\s]?free|all[-\s]?natural)\b",
         "same rule: a registered pesticide is toxic to something, and these are the words EPA names"),
        (r"\b(pest|bug|termite)[-\s]?free\b",
         "nobody can promise the absence of insects: an FTC substantiation problem, and the claim customers quote back"),
        (r"\beco[-\s]?friendly|environmentally\s+friendly|green\s+(treatment|solution)s?\b",
         "FTC Green Guides 16 CFR Part 260: a general environmental claim must be qualified and substantiated"),
    ],
    "verified_states": [],
    "conditional": [
        {"if_page": r"\b(wood\s+infestation\s+inspection\s+report|termite\s+letter|WIIR)\b", "states": ["GA"],
         "why": "this site offers the Official Georgia Wood Infestation Inspection Report, which only a company licensed for wood-destroying organisms may issue, and shows no licence number. (Practice, not a verified advertising requirement.)"},
    ],
    "not_checked": ["State pesticide advertising rules. Only the federal layer is checked."],
}

AUTO = {
    "id": "auto",
    "label": "Auto repair advertising",
    "applies_to": ["auto-repair"],
    "warn": [
        (r"\b(free|no[- ]cost|complimentary)\s+(inspection|estimate|diagnos\w+|scan|check[-\s]?up|check)\b",
         "16 CFR 251.1: the conditions attached to a free offer must appear clearly and next to the offer itself"),
        (r"\bASE[- ]?(certified|master)\b",
         "an ASE certification claim depends on who is actually on staff. Confirm it is current"),
    ],
    "verified_states": ["CA", "MA"],
    "by_state": {
        "CA": {
            "every_page": [
                (r"\b(ARD|automotive repair dealer|registration)\s*#?\s*[0-9]{4,}",
                 "California automotive repair dealer registration number (16 CCR 3371.2 requires firm name, BAR number and registered phone in Internet ads)"),
                (r"\b\d{3}[-. )]\s?\d{3}[-. ]\d{4}\b", "the phone number registered with the Bureau (16 CCR 3371.2)"),
            ],
            "not_checked": ["16 CCR 3371.2: whether the firm name and phone match the Bureau's records."],
        },
        "MA": {
            "every_page": [(r"\b(registration|cert(ificate)?)\s*#?\s*[0-9]{3,}",
                            "Massachusetts certificate of registration number (MGL c.100A 8(a); applies to damage and collision repair shops)")],
            "not_checked": ["Whether this shop does collision repair, which decides if MGL c.100A applies."],
        },
    },
    "not_checked": [
        "Auto repair advertising rules in states other than CA and MA. (Florida's covers print only; New York's covers the shop sign.)",
        "Warranty advertising (Magnuson-Moss). Not verified, so not checked.",
    ],
}

SALON = {
    "id": "salon",
    "label": "Salon, barber and beauty claims",
    "applies_to": ["salon", "barber", "medspa"],
    "warn": [
        (r"\b(repairs?|rebuilds?|restores?|heals?)\s+(damaged\s+)?(hair|the\s+hair\s+shaft|split\s+ends)\b",
         "a structure claim about the body; a cosmetic claiming to change hair structure is marketed as a drug under FD&C Act 201(g)"),
        (r"\b(stimulates?|promotes?|regrows?|restores?|reverses?)\s+(hair\s+)?(growth|loss|thinning|balding)\b",
         "a drug claim, the one most often made about scalp treatments"),
        (r"\b(formaldehyde[-\s]?free|no\s+formaldehyde)\b",
         "most keratin smoothing products release formaldehyde when heated; OSHA has a standing hazard alert on this"),
        (r"\b(damage[-\s]?free|no\s+damage)\s*(bleach|lightener|colou?r|highlights?)?\b",
         "lightener is a chemical service and the claim is not substantiable"),
        (r"\b(permanent|lifetime)\s+(results?|straightening|smoothing|colou?r)\b",
         "hair grows: a permanence claim fails FTC substantiation on its face"),
        (r"\b(organic|all[-\s]?natural|chemical[-\s]?free)\s+(colou?r|dye|products?|treatments?)\b",
         "'organic' on a cosmetic has no FDA definition, and 'chemical-free' is false of any hair colour. FTC Green Guides 16 CFR 260"),
    ],
    "verified_states": [],
    "conditional": [
        {"if_page": r"\b(licensed|board[-\s]?certified)\b",
         "why": "this site says it is licensed but shows no licence number. Cosmetology is licensed in every state and several require the number in advertising. (Practice, not a verified requirement: ask your state board.)"},
    ],
    "not_checked": ["State cosmetology board advertising rules."],
}

PACKS = [DENTAL, CONTRACTOR, PEST, AUTO, SALON]

# Every industry the grader accepts. real-estate and lender are handled in grader.py.
INDUSTRIES = ["general", "real-estate", "lender", "dentist", "orthodontist", "contractor", "roofer",
              "plumber", "electrician", "hvac", "landscaper", "pest-control", "auto-repair", "salon",
              "barber", "medspa"]


def pack_for(industry):
    for p in PACKS:
        if industry in p["applies_to"]:
            return p
    return None


def rules_for(industry, state):
    """Merged rules for one industry in one state: baseline + trade + verified state layer."""
    st = (state or "").upper()
    p = pack_for(industry)
    out = {"label": None, "warn": list(BASELINE["warn"]), "fail": [], "every_page": [], "conditional": [],
           "not_checked": list(BASELINE["not_checked"]), "state": st, "state_covered": None}
    if industry not in ("real-estate",):
        out["warn"].append(HANDICAPPED)
    if not p:
        return out
    out["label"] = p["label"]
    out["warn"] += p.get("warn", [])
    out["fail"] += p.get("fail", [])
    out["every_page"] += p.get("every_page", [])
    out["conditional"] += [c for c in p.get("conditional", []) if not c.get("states") or st in c["states"]]
    out["not_checked"] += p.get("not_checked", [])
    layer = (p.get("by_state") or {}).get(st)
    if p.get("verified_states") is not None:
        out["state_covered"] = bool(layer)
    if layer:
        out["warn"] += layer.get("warn", [])
        out["fail"] += layer.get("fail", [])
        out["every_page"] += layer.get("every_page", [])
        out["not_checked"] += layer.get("not_checked", [])
        # A state rule that requires the number replaces the "says licensed, shows none" nudge.
        if layer.get("every_page"):
            out["conditional"] = []
    return out
