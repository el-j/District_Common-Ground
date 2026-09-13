import type { DistrictBuildingType } from '@district-cg/shared-types';

export interface StageDefinition {
  stage: 0 | 1 | 2 | 3;
  name: string;
  description: string;
  energyCost: number;
  cashCost: number;
  resilienceReward: number;
  icon: string;
}

export interface BuildingBlueprint {
  type: DistrictBuildingType;
  title: string;
  summary: string;
  stages: [StageDefinition, StageDefinition, StageDefinition, StageDefinition];
  dailyProduction: {
    resource: string;
    amount: number;
    description: string;
  };
}

export const BUILDING_BLUEPRINTS: Record<DistrictBuildingType, BuildingBlueprint> = {
  community_kitchen: {
    type: 'community_kitchen',
    title: 'Community Kitchen',
    summary: 'Prepares hot meals and nutritious soup rations to feed striking workers and vulnerable neighbors.',
    stages: [
      { stage: 0, name: 'Blighted Lot', description: 'Abandoned corner filled with rubble and weeds.', energyCost: 10, cashCost: 0, resilienceReward: 2, icon: '🏚️' },
      { stage: 1, name: 'Groundwork & Hearth', description: 'Poured foundation, timber framing, rough brick hearth.', energyCost: 15, cashCost: 15, resilienceReward: 5, icon: '🧱' },
      { stage: 2, name: 'Operational Kitchen', description: 'Commercial stoves, soup kettles, and dining tables active.', energyCost: 20, cashCost: 25, resilienceReward: 10, icon: '🍲' },
      { stage: 3, name: 'Solarpunk Feast Hall', description: 'Rooftop herb conservatory, sourdough bakery, and open patio.', energyCost: 25, cashCost: 40, resilienceReward: 20, icon: '✨' },
    ],
    dailyProduction: { resource: 'Soup Rations', amount: 3, description: 'Lowers daily grocery inflation and provides quick energy snacks.' },
  },
  solar_cooperative: {
    type: 'solar_cooperative',
    title: 'Solar Cooperative',
    summary: 'Rooftop photovoltaic arrays and battery banks providing clean power immune to corporate energy tariffs.',
    stages: [
      { stage: 0, name: 'Overgrown Rooftop', description: 'Leaking tar paper and obsolete air conditioning units.', energyCost: 10, cashCost: 0, resilienceReward: 2, icon: '🏚️' },
      { stage: 1, name: 'Inverter Mounting', description: 'Aluminum racking installed and micro-inverter wiring laid.', energyCost: 15, cashCost: 20, resilienceReward: 5, icon: '⚡' },
      { stage: 2, name: 'Grid Co-op Active', description: 'Photovoltaic panels online feeding the neighborhood microgrid.', energyCost: 20, cashCost: 35, resilienceReward: 12, icon: '🔋' },
      { stage: 3, name: 'Solarpunk Sun Battery', description: 'Bifacial glass panels, smart flywheel storage, and emergency microgrid.', energyCost: 30, cashCost: 50, resilienceReward: 25, icon: '☀️' },
    ],
    dailyProduction: { resource: 'Stored kWh', amount: 4, description: 'Reduces electric bills to $0 and powers cooling shelters during heatwaves.' },
  },
  urban_garden: {
    type: 'urban_garden',
    title: 'Community Garden & Orchard',
    summary: 'Raised organic soil beds, heirloom fruit trees, and pollinator havens restoring local ecology.',
    stages: [
      { stage: 0, name: 'Compacted Asphalt', description: 'Cracked parking spaces and petroleum runoff.', energyCost: 10, cashCost: 0, resilienceReward: 2, icon: '🏚️' },
      { stage: 1, name: 'Soil Remediation', description: 'Asphalt removed, compost trenches dug, worm bins active.', energyCost: 12, cashCost: 10, resilienceReward: 5, icon: '🌱' },
      { stage: 2, name: 'Bountiful Planters', description: 'Kale, heirloom tomatoes, and berry trellises producing food.', energyCost: 18, cashCost: 15, resilienceReward: 10, icon: '🥕' },
      { stage: 3, name: 'Canopy Agroforest', description: 'Apple trees, beehives, rainwater swales, and winding walking paths.', energyCost: 25, cashCost: 30, resilienceReward: 20, icon: '🌳' },
    ],
    dailyProduction: { resource: 'Fresh Produce', amount: 5, description: 'Provides ingredients for the kitchen and increases neighborhood trust.' },
  },
  tool_library: {
    type: 'tool_library',
    title: 'Commons Tool Library',
    summary: 'Lends cargo bikes, sewing machines, angle grinders, and 3D printers for community repairs.',
    stages: [
      { stage: 0, name: 'Derelict Garage', description: 'Rusted roll-up door jammed with broken junk.', energyCost: 10, cashCost: 0, resilienceReward: 2, icon: '🏚️' },
      { stage: 1, name: 'Workbenches & Shelves', description: 'Pegboard walls hung, heavy workbenches built, safety gear organized.', energyCost: 15, cashCost: 15, resilienceReward: 5, icon: '🔧' },
      { stage: 2, name: 'Lending Depot', description: 'Catalog active with drill presses, cargo trailers, and sewing stations.', energyCost: 20, cashCost: 25, resilienceReward: 10, icon: '🚲' },
      { stage: 3, name: 'Open Maker FabLab', description: 'Solar CNC routers, battery welder, and repair cafe lounge.', energyCost: 25, cashCost: 45, resilienceReward: 20, icon: '🛠️' },
    ],
    dailyProduction: { resource: 'Tool Maintenance Hours', amount: 2, description: 'Reduces transit commuting delays and accelerates district construction.' },
  },
  clinic: {
    type: 'clinic',
    title: 'Mutual Care Clinic',
    summary: 'Community triage, cooling shelter during climate spikes, and mental health peer circles.',
    stages: [
      { stage: 0, name: 'Empty Storefront', description: 'Dusty display windows and peeling linoleum floor.', energyCost: 10, cashCost: 0, resilienceReward: 2, icon: '🏚️' },
      { stage: 1, name: 'Sanitation & Partitions', description: 'Clean room ventilation, privacy curtains, first-aid storage.', energyCost: 15, cashCost: 20, resilienceReward: 6, icon: '🩹' },
      { stage: 2, name: 'Street Medic Sanctuary', description: 'Oxygen concentrators, cool mist fans, and herbal apothecary.', energyCost: 22, cashCost: 30, resilienceReward: 14, icon: '🏥' },
      { stage: 3, name: 'Holistic Wellness Commons', description: 'Rooftop meditation deck, botanical remedies, and 24/7 care network.', energyCost: 30, cashCost: 55, resilienceReward: 25, icon: '💖' },
    ],
    dailyProduction: { resource: 'Care Kits', amount: 2, description: 'Reduces player stress level and shields vulnerable elders in crises.' },
  },
};
