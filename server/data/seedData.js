// Seed Data for ClearPath - Chandigarh, India

export const HOSPITALS = [
  {
    id: "hosp_1",
    name: "PGIMER (Post Graduate Institute)",
    locationName: "Sector 12, Chandigarh",
    lat: 30.7656,
    lng: 76.7745,
    emergencyPhone: "+91 172 2756565",
    traumaLevel: "Level 1 Advanced Trauma & Apex Cardiac Centre",
    availableBeds: 28,
    icuAvailable: 8
  },
  {
    id: "hosp_2",
    name: "GMCH-32 (Govt Medical College Hospital)",
    locationName: "Sector 32, Chandigarh",
    lat: 30.7088,
    lng: 76.7725,
    emergencyPhone: "+91 172 2665253",
    traumaLevel: "Emergency Resuscitation & Multispeciality Unit",
    availableBeds: 20,
    icuAvailable: 5
  },
  {
    id: "hosp_3",
    name: "GMSH-16 (Civil Hospital)",
    locationName: "Sector 16, Chandigarh",
    lat: 30.7490,
    lng: 76.7820,
    emergencyPhone: "+91 172 2752000",
    traumaLevel: "24/7 Rapid Emergency Care Centre",
    availableBeds: 15,
    icuAvailable: 4
  }
];

export const JUNCTIONS = [
  {
    id: "junc_1",
    name: "Matka Chowk (Sectors 9/10/16/17)",
    lat: 30.7512,
    lng: 76.7885,
    status: "clear",
    trafficDensity: "High",
    camerasOnline: true
  },
  {
    id: "junc_2",
    name: "Tribune Chowk (Dakshin Marg)",
    lat: 30.7032,
    lng: 76.7865,
    status: "clear",
    trafficDensity: "Heavy",
    camerasOnline: true
  },
  {
    id: "junc_3",
    name: "Transport Chowk (Madhya Marg)",
    lat: 30.7245,
    lng: 76.8120,
    status: "clear",
    trafficDensity: "Heavy",
    camerasOnline: true
  },
  {
    id: "junc_4",
    name: "Aroma Chowk (Sectors 21/22)",
    lat: 30.7320,
    lng: 76.7760,
    status: "clear",
    trafficDensity: "Moderate",
    camerasOnline: true
  },
  {
    id: "junc_5",
    name: "Piccadilly Chowk (Sectors 22/34/35)",
    lat: 30.7230,
    lng: 76.7640,
    status: "clear",
    trafficDensity: "Moderate",
    camerasOnline: true
  },
  {
    id: "junc_6",
    name: "Kisan Bhawan Chowk (Sectors 35/43)",
    lat: 30.7180,
    lng: 76.7520,
    status: "clear",
    trafficDensity: "Moderate",
    camerasOnline: true
  },
  {
    id: "junc_7",
    name: "Sector 17/18 Light Point (Jan Marg)",
    lat: 30.7410,
    lng: 76.7830,
    status: "clear",
    trafficDensity: "High",
    camerasOnline: true
  },
  {
    id: "junc_8",
    name: "PGI Chowk / Sector 11-12 Roundabout",
    lat: 30.7610,
    lng: 76.7780,
    status: "clear",
    trafficDensity: "High",
    camerasOnline: true
  },
  {
    id: "junc_9",
    name: "Housing Board Chowk (Panchkula Border)",
    lat: 30.7190,
    lng: 76.8350,
    status: "clear",
    trafficDensity: "Heavy",
    camerasOnline: true
  },
  {
    id: "junc_10",
    name: "Press Chowk (Madhya Marg / Sectors 8/18)",
    lat: 30.7455,
    lng: 76.7925,
    status: "clear",
    trafficDensity: "Moderate",
    camerasOnline: true
  }
];

export const START_LOCATIONS = [
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
