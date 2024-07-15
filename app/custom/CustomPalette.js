const KEIS = {
  ENERGY: 'Energy consumption',
  CARBON: 'Carbon-dioxide emissions',
  WATER: 'Water usage',
  WASTE: 'Waste generation',
  RESOURCE: 'Resource efficiency',
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
