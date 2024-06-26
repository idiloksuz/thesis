const KEIS = {
  ENERGY: 'Total energy',
  RENEWABLE_ENERGY: 'Renewable energy',
  NON_RENEWABLE_ENERGY: 'Non-Renewable energy',
  INDOOR_ENERGY: 'Indoor energy',
  TRANSPORTATION_ENERGY: 'Transportation energy',
  TOTAL_WASTE: 'Total waste',
  RECYCLABLE_WASTE: 'Recyclable waste',
  NON_RECYCLABLE_WASTE: 'Non-Recyclable waste',
  HAZARDOUS_WASTE: 'Hazardous waste',
  TOTAL_WATER_WITHDRAWAL: 'Total water withdrawal',
  WATER_NON_CONSUMPTIVE_USE: 'Water Non-consumptive use',
  WATER_USE: 'Water Use',
  WATER_POLLUTION: 'Water Pollution',
  TOTAL_EMISSIONS_TO_AIR: 'Total emissions to air',
  GHG_EMISSIONS: 'GHGs emissions',
  CO2_EMISSIONS: 'CO2 emissions',
  NOX_SOX_EMISSIONS: 'NOx and SOx emissions'
};

export default class CustomPalette {
  constructor(bpmnFactory, create, elementFactory, palette, translate) {
    this.bpmnFactory = bpmnFactory;
    this.create = create;
    this.elementFactory = elementFactory;
    this.translate = translate;

    palette.registerProvider(this);
  }

  getPaletteEntries(element) {
    const {
      bpmnFactory,
      create,
      elementFactory,
      translate
    } = this;

    function createTask(kei) {
      return function(event) {
        const businessObject = bpmnFactory.create('bpmn:Task');
        businessObject.kei = kei;

        const shape = elementFactory.createShape({
          type: 'bpmn:Task',
          businessObject: businessObject
        });

        create.start(event, shape);
      };
    }

    return Object.keys(KEIS).reduce((entries, key) => {
      entries[`create.${key.toLowerCase().replace(/_/g, '-')}-task`] = {
        group: 'activity',
        className: `bpmn-icon-task ${key.toLowerCase()}`,
        title: translate(`Create Task with ${KEIS[key]} KEI`),
        action: {
          dragstart: createTask(KEIS[key]),
          click: createTask(KEIS[key])
        }
      };
      return entries;
    }, {});
  }
}

CustomPalette.$inject = [
  'bpmnFactory',
  'create',
  'elementFactory',
  'palette',
  'translate'
];
