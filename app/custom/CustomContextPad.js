import { assign } from 'min-dash';
import { is } from 'bpmn-js/lib/util/ModelUtil';

const KEI_CATEGORIES = {
  Energy: ["Energy consumption"],
  Waste: ["Waste generation"],
  Water: ["Water usage"],
  Emissions: ["Carbondioxide emissions"]
};

export default class CustomContextPad {
  constructor(bpmnFactory, config, contextPad, create, elementFactory, injector, translate, eventBus, modeling, elementRegistry) {
    this.bpmnFactory = bpmnFactory;
    this.create = create;
    this.elementFactory = elementFactory;
    this.translate = translate;
    this.eventBus = eventBus;
    this.modeling = modeling;
    this.elementRegistry = elementRegistry;
    this.bpmnModeler = null; // Initialize with null

    if (config.autoPlace !== false) {
      this.autoPlace = injector.get('autoPlace', false);
    }

    contextPad.registerProvider(this);
  }

  setBpmnModeler(bpmnModeler) {
    this.bpmnModeler = bpmnModeler;
  }

  changeTaskType(element, newType) {
    const businessObject = element.businessObject;

    // Preserve KEI properties
    const keiProperties = {
      kei: businessObject.kei,
      energyConsumption: businessObject.energyConsumption,
      carbonDioxideEmissions: businessObject.carbonDioxideEmissions,
      waterUsage: businessObject.waterUsage,
      wasteGeneration: businessObject.wasteGeneration
    };

    // Create a new element of the specified type
    const newElement = this.elementFactory.createShape({
      type: newType,
      businessObject: businessObject
    });

    // Assign KEI properties to the new element
    assign(newElement.businessObject, keiProperties);

    // Replace the old element with the new element
    this.modeling.replaceShape(element, newElement);

    // Fire element changed event
    this.eventBus.fire('element.changed', { element: newElement });
  }

  getContextPadEntries(element) {
    const {
      autoPlace,
      bpmnFactory,
      create,
      elementFactory,
      translate,
      eventBus,
      bpmnModeler,
      modeling,
      elementRegistry
    } = this;

    const actions = {};

    const editTaskKEI = (event, element) => {
      const businessObject = element.businessObject;
      const menu = document.createElement('div');
      menu.className = 'custom-kei-menu';

      Object.keys(KEI_CATEGORIES).forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'custom-kei-menu-category';
        categoryItem.innerText = category;

        const subMenu = document.createElement('div');
        subMenu.className = 'custom-kei-submenu';

        KEI_CATEGORIES[category].forEach(kei => {
          const menuItem = document.createElement('div');
          menuItem.className = 'custom-kei-menu-item';
          menuItem.innerText = kei;
          menuItem.addEventListener('click', () => {
            const measured = confirm('Is the task measured?');
            let monitored = false;

            if (measured) {
              if (kei === 'Energy consumption') {
                const kwh = prompt('Enter the number of kWh:');
                businessObject.energyConsumption = kwh;
              } else if (kei === 'Carbondioxide emissions') {
                const kgs = prompt('Enter the number of kilograms of CO2:');
                businessObject.carbonDioxideEmissions = kgs;
              } else if (kei === 'Water usage') {
                const liters = prompt('Enter the number of liters:');
                businessObject.waterUsage = liters;
              } else if (kei === 'Waste generation') {
                const kgs = prompt('Enter the number of kilograms:');
                businessObject.wasteGeneration = kgs;
              }
            } else {
              monitored = true;
              businessObject.energyConsumption = 'monitored';
              businessObject.carbonDioxideEmissions = 'monitored';
              businessObject.waterUsage = 'monitored';
              businessObject.wasteGeneration = 'monitored';
            }

            businessObject.monitored = monitored;
            businessObject.kei = kei;
            ensureKEIExtensionElement(businessObject, kei, monitored, bpmnModeler);
            eventBus.fire('element.changed', { element });
            document.body.removeChild(menu);
          });
          subMenu.appendChild(menuItem);
        });

        categoryItem.appendChild(subMenu);
        menu.appendChild(categoryItem);
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

    actions['edit.kei-task'] = {
      group: 'edit',
      className: 'bpmn-icon-custom-kei',  // Use your custom icon class here
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
  'eventBus',
  'modeling',
  'elementRegistry'
];

function ensureKEIExtensionElement(businessObject, kei, monitored, bpmnModeler) {
  const moddle = bpmnModeler.get('moddle');
  const extensionElements = businessObject.extensionElements || moddle.create('bpmn:ExtensionElements');
  businessObject.extensionElements = extensionElements;

  let keiElement = extensionElements.get('values').find(el => el.$type === 'qa:Kei');
  if (!keiElement) {
    keiElement = moddle.create('qa:Kei', { value: kei, monitored: monitored });
    extensionElements.get('values').push(keiElement);
  } else {
    keiElement.value = kei;
    keiElement.monitored = monitored;
  }

  if (kei === 'Energy consumption') {
    let energyConsumptionElement = extensionElements.get('values').find(el => el.$type === 'qa:EnergyConsumption');
    if (!energyConsumptionElement) {
      energyConsumptionElement = moddle.create('qa:EnergyConsumption', { value: monitored ? 'monitored' : businessObject.energyConsumption, unit: 'kWh' });
      extensionElements.get('values').push(energyConsumptionElement);
    } else {
      energyConsumptionElement.value = monitored ? 'monitored' : businessObject.energyConsumption;
    }
  }

  if (kei === 'Carbondioxide emissions') {
    let carbonDioxideEmissionsElement = extensionElements.get('values').find(el => el.$type === 'qa:CarbonDioxideEmissions');
    if (!carbonDioxideEmissionsElement) {
      carbonDioxideEmissionsElement = moddle.create('qa:CarbonDioxideEmissions', { value: monitored ? 'monitored' : businessObject.carbonDioxideEmissions, unit: 'kg' });
      extensionElements.get('values').push(carbonDioxideEmissionsElement);
    } else {
      carbonDioxideEmissionsElement.value = monitored ? 'monitored' : businessObject.carbonDioxideEmissions;
    }
  }

  if (kei === 'Water usage') {
    let waterUsageElement = extensionElements.get('values').find(el => el.$type === 'qa:WaterUsage');
    if (!waterUsageElement) {
      waterUsageElement = moddle.create('qa:WaterUsage', { value: monitored ? 'monitored' : businessObject.waterUsage, unit: 'liters' });
      extensionElements.get('values').push(waterUsageElement);
    } else {
      waterUsageElement.value = monitored ? 'monitored' : businessObject.waterUsage;
    }
  }

  if (kei === 'Waste generation') {
    let wasteGenerationElement = extensionElements.get('values').find(el => el.$type === 'qa:WasteGeneration');
    if (!wasteGenerationElement) {
      wasteGenerationElement = moddle.create('qa:WasteGeneration', { value: monitored ? 'monitored' : businessObject.wasteGeneration, unit: 'kg' });
      extensionElements.get('values').push(wasteGenerationElement);
    } else {
      wasteGenerationElement.value = monitored ? 'monitored' : businessObject.wasteGeneration;
    }
  }
}

// CSS for the custom KEI menu
const style = document.createElement('style');
style.innerHTML = `
  .custom-kei-menu {
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    padding: 8px;
    width: 200px;
    z-index: 1000;
  }
  .custom-kei-menu-category {
    padding: 8px;
    cursor: pointer;
    border-bottom: 1px solid #eee;
  }
  .custom-kei-menu-category:last-child {
    border-bottom: none;
  }
  .custom-kei-submenu {
    display: none;
    padding-left: 16px;
  }
  .custom-kei-menu-category:hover > .custom-kei-submenu {
    display: block;
  }
  .custom-kei-menu-item {
    padding: 8px;
    cursor: pointer;
    border-bottom: 1px solid #eee;
  }
  .custom-kei-menu-item:last-child {
    border-bottom: none;
  }
  .custom-kei-menu-item:hover {
    background: #f5f5f5;
  }
  .bpmn-icon-custom-kei {
    display: inline-block;
    width: 24px;
    height: 24px;
    background-image: url('./sustain.png'); /* Update with your icon path */
    background-size: contain;
    background-repeat: no-repeat;
  }
  .bpmn-icon {
    display: inline-block;
    width: 24px;
    height: 24px;
  }
  .bpmn-icon-custom-kei {
    background-size: 24px 20px;
    vertical-align: -6px;
  }
`;
document.head.appendChild(style);
