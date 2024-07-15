import { assign } from 'min-dash';
import { is } from 'bpmn-js/lib/util/ModelUtil';

const HIGH_PRIORITY = 1500;
const KEIS = [
  "Energy consumption",
  "Carbon-dioxide emissions",
  "Water usage",
  "Waste generation",
  "Resource efficiency"
];

export default class CustomContextPad {
  constructor(bpmnFactory, config, contextPad, create, elementFactory, injector, translate, eventBus) {
    this.bpmnFactory = bpmnFactory;
    this.create = create;
    this.elementFactory = elementFactory;
    this.translate = translate;
    this.eventBus = eventBus;
    this.bpmnModeler = null; // Initialize with null

    if (config.autoPlace !== false) {
      this.autoPlace = injector.get('autoPlace', false);
    }

    contextPad.registerProvider(this);
  }

  setBpmnModeler(bpmnModeler) {
    this.bpmnModeler = bpmnModeler;
  }

  getContextPadEntries(element) {
    const {
      autoPlace,
      bpmnFactory,
      create,
      elementFactory,
      translate,
      eventBus,
      bpmnModeler
    } = this;

    const actions = {};

    function appendTaskWithKEI(kei) {
      return function(event) {
        const businessObject = bpmnFactory.create('bpmn:Task');
        businessObject.kei = kei;

        if (kei === 'Energy consumption') {
          const kwh = prompt('Enter the number of kWh:');
          businessObject.energyConsumption = kwh;
          // updateTaskLabel(businessObject, kei, kwh);
        }

        const shape = elementFactory.createShape({
          type: 'bpmn:Task',
          businessObject: businessObject
        });

        if (autoPlace) {
          autoPlace.append(element, shape);
        } else {
          create.start(event, shape, element);
        }

        ensureKEIExtensionElement(businessObject, kei, bpmnModeler);
        eventBus.fire('element.changed', { element: shape });
      };
    }

    function editTaskKEI(event, element) {
      const businessObject = element.businessObject;
      const menu = document.createElement('div');
      menu.className = 'custom-kei-menu';

      KEIS.forEach(kei => {
        const menuItem = document.createElement('div');
        menuItem.className = 'custom-kei-menu-item';
        menuItem.innerText = kei;
        menuItem.addEventListener('click', () => {
          businessObject.kei = kei;
          if (kei === 'Energy consumption') {
            const kwh = prompt('Enter the number of kWh:');
            businessObject.energyConsumption = kwh;
            // updateTaskLabel(businessObject, kei, kwh);
          }
          ensureKEIExtensionElement(businessObject, kei, bpmnModeler);
          eventBus.fire('element.changed', { element });
          document.body.removeChild(menu);
        });
        menu.appendChild(menuItem);
      });

      document.body.appendChild(menu);
      const { clientX, clientY } = event.originalEvent || event;
      menu.style.position = 'absolute';
      menu.style.left = `${clientX}px`;
      menu.style.top = `${clientY}px`;

      setTimeout(() => {
        document.addEventListener('click', (e) => {
          if (!menu.contains(e.target)) {
            if (menu.parentElement) {
              document.body.removeChild(menu);
            }
          }
        }, { once: true });
      }, 100);
    }

    actions['append.kei-task'] = {
      group: 'model',
      className: 'bpmn-icon-task',
      title: translate('Append Task with KEI'),
      action: {
        click: appendTaskWithKEI('Specify KEI'),
        dragstart: appendTaskWithKEI('Specify KEI')
      }
    };

    actions['edit.kei-task'] = {
      group: 'edit',
      className: 'bpmn-icon-screw-wrench',
      title: translate('Edit KEI'),
      action: {
        click: (event, element) => {
          editTaskKEI(event, element);
        }
      }
    };

    return actions;
  }
}

CustomContextPad.$inject = [
  'bpmnFactory',
  'config',
  'contextPad',
  'create',
  'elementFactory',
  'injector',
  'translate',
  'eventBus'
];

function ensureKEIExtensionElement(businessObject, kei, bpmnModeler) {
  const moddle = bpmnModeler.get('moddle');
  const extensionElements = businessObject.extensionElements || moddle.create('bpmn:ExtensionElements');
  businessObject.extensionElements = extensionElements;

  let keiElement = extensionElements.get('values').find(el => el.$type === 'qa:Kei');
  if (!keiElement) {
    keiElement = moddle.create('qa:Kei', { value: kei });
    extensionElements.get('values').push(keiElement);
  } else {
    keiElement.value = kei;
  }

  if (kei === 'Energy consumption') {
    let energyConsumptionElement = extensionElements.get('values').find(el => el.$type === 'qa:EnergyConsumption');
    if (!energyConsumptionElement) {
      energyConsumptionElement = moddle.create('qa:EnergyConsumption', { value: businessObject.energyConsumption, unit: 'kWh' });
      extensionElements.get('values').push(energyConsumptionElement);
    } else {
      energyConsumptionElement.value = businessObject.energyConsumption;
    }
  }
}

function updateTaskLabel(businessObject, kei, value) {
  if (kei === 'Energy consumption') {
    businessObject.name = `Energy consumption: ${value} kWh`;
  }
}
