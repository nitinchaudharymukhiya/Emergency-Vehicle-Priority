// Seed Data and Constants for Frontend - Chandigarh, India

export const CHANDIGARH_CENTER = {
  lat: 30.7333,
  lng: 76.7794,
  zoom: 13
};

// Backwards compatibility alias
export const KANNUR_CENTER = CHANDIGARH_CENTER;

export const SAMPLE_HOSPITALS = [
  {
    id: "hosp_1",
    name: "PGIMER (Post Graduate Institute)",
    locationName: "Sector 12, Chandigarh",
    lat: 30.7656,
    lng: 76.7745,
    emergencyPhone: "+91 172 2756565",
    traumaLevel: "Level 1 Advanced Trauma & Apex Cardiac Centre",
    bedsAvailable: 28,
    color: "#ef4444"
  },
  {
    id: "hosp_2",
    name: "GMCH-32 (Govt Medical College Hospital)",
    locationName: "Sector 32, Chandigarh",
    lat: 30.7088,
    lng: 76.7725,
    emergencyPhone: "+91 172 2665253",
    traumaLevel: "Emergency Resuscitation & Multispeciality Unit",
    bedsAvailable: 20,
    color: "#06b6d4"
  },
  {
    id: "hosp_3",
    name: "GMSH-16 (Civil Hospital)",
    locationName: "Sector 16, Chandigarh",
    lat: 30.7490,
    lng: 76.7820,
    emergencyPhone: "+91 172 2752000",
    traumaLevel: "24/7 Rapid Emergency Care Centre",
    bedsAvailable: 15,
    color: "#8b5cf6"
  }
];

export const SAMPLE_JUNCTIONS = [
  {
    id: "junc_1",
    name: "Matka Chowk (Sectors 9/10/16/17)",
    lat: 30.7512,
    lng: 76.7885,
    status: "clear"
  },
  {
    id: "junc_2",
    name: "Tribune Chowk (Dakshin Marg)",
    lat: 30.7032,
    lng: 76.7865,
    status: "clear"
  },
  {
    id: "junc_3",
    name: "Transport Chowk (Madhya Marg)",
    lat: 30.7245,
    lng: 76.8120,
    status: "clear"
  },
  {
    id: "junc_4",
    name: "Aroma Chowk (Sectors 21/22)",
    lat: 30.7320,
    lng: 76.7760,
    status: "clear"
  },
  {
    id: "junc_5",
    name: "Piccadilly Chowk (Sectors 22/34/35)",
    lat: 30.7230,
    lng: 76.7640,
    status: "clear"
  },
  {
    id: "junc_6",
    name: "Kisan Bhawan Chowk (Sectors 35/43)",
    lat: 30.7180,
    lng: 76.7520,
    status: "clear"
  },
  {
    id: "junc_7",
    name: "Sector 17/18 Light Point (Jan Marg)",
    lat: 30.7410,
    lng: 76.7830,
    status: "clear"
  },
  {
    id: "junc_8",
    name: "PGI Chowk / Sector 11-12 Roundabout",
    lat: 30.7610,
    lng: 76.7780,
    status: "clear"
  },
  {
    id: "junc_9",
    name: "Housing Board Chowk (Panchkula Border)",
    lat: 30.7190,
    lng: 76.8350,
    status: "clear"
  },
  {
    id: "junc_10",
    name: "Press Chowk (Madhya Marg)",
    lat: 30.7455,
    lng: 76.7925,
    status: "clear"
  }
];

export const PRESET_START_LOCATIONS = [
  {
    name: "Sukhna Lake Promenade",
    lat: 30.7421,
    lng: 76.8188
  },
  {
    name: "Elante Mall (Industrial Area Phase 1)",
    lat: 30.7055,
    lng: 76.8015
  },
  {
    name: "Chandigarh Railway Station (Daria)",
    lat: 30.7020,
    lng: 76.8220
  },
  {
    name: "Chandigarh IT Park (Kishangarh)",
    lat: 30.7290,
    lng: 76.8420
  },
  {
    name: "Sector 17 Plaza (City Centre)",
    lat: 30.7398,
    lng: 76.7827
  }
];

export const DEMO_SCENARIOS = [
  {
    id: "scenario_1",
    title: "Scenario A: Apex Cardiac Emergency",
    description: "Sukhna Lake ➔ PGIMER Advanced Cardiac Centre via Madhya Marg",
    ambulanceId: "AMB-108",
    patientCondition: "Acute ST-Elevation Myocardial Infarction",
    severity: "Critical",
    hospitalId: "hosp_1",
    startLocation: PRESET_START_LOCATIONS[0]
  },
  {
    id: "scenario_2",
    title: "Scenario B: Multi-Vehicle Highway Trauma",
    description: "Elante Mall ➔ GMCH Sector 32 Emergency Trauma Wing",
    ambulanceId: "AMB-102",
    patientCondition: "Multiple Trauma / Blunt Chest Injury",
    severity: "Critical",
    hospitalId: "hosp_2",
    startLocation: PRESET_START_LOCATIONS[1]
  },
  {
    id: "scenario_3",
    title: "Scenario C: Critical Pediatric Respiratory Distress",
    description: "Chandigarh IT Park ➔ GMSH Sector 16 Rapid Care",
    ambulanceId: "AMB-112",
    patientCondition: "Severe Acute Respiratory Failure",
    severity: "Serious",
    hospitalId: "hosp_3",
    startLocation: PRESET_START_LOCATIONS[3]
  }
];

export const PATIENT_CONDITIONS = [
  "Acute Myocardial Infarction (Cardiac Code Red)",
  "Multiple Trauma / Road Traffic Accident",
  "Severe Acute Respiratory Distress",
  "Acute Ischemic Stroke / Neurological Emergency",
  "Critical Obstetric Emergency",
  "Severe Burn / Inhalation Injury",
  "Pediatric Status Epilepticus"
];

export const SEVERITIES = [
  {
    id: "Critical",
    label: "Critical (Code Red)",
    badgeColor: "bg-red-500/20 text-red-400 border-red-500/40",
    dotColor: "bg-red-500"
  },
  {
    id: "Serious",
    label: "Serious (Code Orange)",
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    dotColor: "bg-amber-500"
  },
  {
    id: "Stable",
    label: "Stable (Code Green)",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    dotColor: "bg-emerald-500"
  }
];
