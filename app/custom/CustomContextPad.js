import { assign } from 'min-dash';
import { is } from 'bpmn-js/lib/util/ModelUtil';

const KEI_CATEGORIES = {
  Energy: [
    "Energy consumption",
    "Renewable energy",
    "Non-Renewable energy",
    "Indoor energy",
    "Transportation energy",
    "[Single source of energy]"
  ],
  Waste: ["Waste generation"],
  Water: ["Water usage"],
  Emissions: ["Carbondioxide emissions"]
};

export default class CustomContextPad {
  constructor(bpmnFactory, config, contextPad, create, elementFactory, injector, translate, eventBus, modeling, elementRegistry, popupMenu) {
    this.bpmnFactory = bpmnFactory;
    this.create = create;
    this.elementFactory = elementFactory;
    this.translate = translate;
    this.eventBus = eventBus;
    this.modeling = modeling;
    this.elementRegistry = elementRegistry;
    this.popupMenu = popupMenu;
    this.bpmnModeler = null; // Initialize with null

    if (config.autoPlace !== false) {
      this.autoPlace = injector.get('autoPlace', false);
    }

    contextPad.registerProvider(this);

    // Listen for the replace event to handle KEI property preservation
    eventBus.on('replace', (event) => {
      const { oldShape, newShape } = event.context;
      //print the old and new shapes for debugging
      console.log('Old shape:', oldShape);
      this.preserveKEIProperties(oldShape, newShape);
    });
  }

  setBpmnModeler(bpmnModeler) {
    this.bpmnModeler = bpmnModeler;
  }

  preserveKEIProperties(oldShape, newShape) {
    const oldBusinessObject = oldShape.businessObject;
    const newBusinessObject = newShape.businessObject;

    const keiProperties = {
      kei: oldBusinessObject.kei,
      energyConsumption: oldBusinessObject.energyConsumption,
      renewableEnergy: oldBusinessObject.renewableEnergy,
      nonRenewableEnergy: oldBusinessObject.nonRenewableEnergy,
      indoorEnergy: oldBusinessObject.indoorEnergy,
      transportationEnergy: oldBusinessObject.transportationEnergy,
      singleSourceOfEnergy: oldBusinessObject.singleSourceOfEnergy,
      carbonDioxideEmissions: oldBusinessObject.carbonDioxideEmissions,
      waterUsage: oldBusinessObject.waterUsage,
      wasteGeneration: oldBusinessObject.wasteGeneration,
      monitored: oldBusinessObject.monitored
    };

    //print the preserved KEI properties for debugging
    console.log('Preserved KEI properties:', keiProperties);

    assign(newBusinessObject, keiProperties);
    this.ensureKEIExtensionElements(newBusinessObject, keiProperties);
    this.modeling.updateProperties(newShape, { businessObject: newBusinessObject });
    this.eventBus.fire('element.changed', { element: newShape });

    // Log the preserved KEI properties for debugging
    console.log('Preserved KEI properties:', keiProperties);
  }

  ensureKEIExtensionElements(businessObject, keiProperties) {
    const moddle = this.bpmnModeler.get('moddle');
    const extensionElements = businessObject.extensionElements || moddle.create('bpmn:ExtensionElements');
    businessObject.extensionElements = extensionElements;

    let keiElement = extensionElements.get('values').find(el => el.$type === 'sm:Kei');
    if (!keiElement) {
      keiElement = moddle.create('sm:Kei', { value: keiProperties.kei, monitored: keiProperties.monitored });
      extensionElements.get('values').push(keiElement);
    } else {
      keiElement.value = keiProperties.kei;
      keiElement.monitored = keiProperties.monitored;
    }

    this.handleKEIElement('Energy consumption', 'sm:EnergyConsumption', businessObject, 'energyConsumption', 'kWh', keiProperties.monitored, moddle, extensionElements);
    this.handleKEIElement('Renewable energy', 'sm:RenewableEnergy', businessObject, 'renewableEnergy', 'kWh', keiProperties.monitored, moddle, extensionElements);
    this.handleKEIElement('Non-Renewable energy', 'sm:NonRenewableEnergy', businessObject, 'nonRenewableEnergy', 'kWh', keiProperties.monitored, moddle, extensionElements);
    this.handleKEIElement('Indoor energy', 'sm:IndoorEnergy', businessObject, 'indoorEnergy', 'kWh', keiProperties.monitored, moddle, extensionElements);
    this.handleKEIElement('Transportation energy', 'sm:TransportationEnergy', businessObject, 'transportationEnergy', 'kWh', keiProperties.monitored, moddle, extensionElements);
    this.handleKEIElement('[Single source of energy]', 'sm:SingleSourceOfEnergy', businessObject, 'singleSourceOfEnergy', 'kWh', keiProperties.monitored, moddle, extensionElements);
    this.handleKEIElement('Carbondioxide emissions', 'sm:CarbonDioxideEmissions', businessObject, 'carbonDioxideEmissions', 'kg', keiProperties.monitored, moddle, extensionElements);
    this.handleKEIElement('Water usage', 'sm:WaterUsage', businessObject, 'waterUsage', 'liters', keiProperties.monitored, moddle, extensionElements);
    this.handleKEIElement('Waste generation', 'sm:WasteGeneration', businessObject, 'wasteGeneration', 'kg', keiProperties.monitored, moddle, extensionElements);
  }

  handleKEIElement(keiType, elementType, businessObject, property, unit, monitored, moddle, extensionElements) {
    if (businessObject.kei === keiType) {
      let keiElement = extensionElements.get('values').find(el => el.$type === elementType);
      if (!keiElement) {
        keiElement = moddle.create(elementType, { value: monitored ? 'monitored' : businessObject[property], unit: unit });
        extensionElements.get('values').push(keiElement);
      } else {
        keiElement.value = monitored ? 'monitored' : businessObject[property];
      }
    }
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
      elementRegistry,
      popupMenu
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
              } else if (kei === 'Renewable energy') {
                const source = prompt('Enter the number of kWh for renewable energy:');
                businessObject.renewableEnergy = source;
              } else if (kei === 'Non-Renewable energy') {
                const source = prompt('Enter the number of kWh for non-renewable energy:');
                businessObject.nonRenewableEnergy = source;
              } else if (kei === 'Indoor energy') {
                const usage = prompt('Enter the number of kWh for indoor energy usage:');
                businessObject.indoorEnergy = usage;
              } else if (kei === 'Transportation energy') {
                const usage = prompt('Enter the number of kWh for transportation energy usage:');
                businessObject.transportationEnergy = usage;
              } else if (kei === '[Single source of energy]') {
                const source = prompt('Enter the number of kWh for single source of energy:');
                businessObject.singleSourceOfEnergy = source;
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
              businessObject.renewableEnergy = 'monitored';
              businessObject.nonRenewableEnergy = 'monitored';
              businessObject.indoorEnergy = 'monitored';
              businessObject.transportationEnergy = 'monitored';
              businessObject.singleSourceOfEnergy = 'monitored';
              businessObject.carbonDioxideEmissions = 'monitored';
              businessObject.waterUsage = 'monitored';
              businessObject.wasteGeneration = 'monitored';
            }

            businessObject.monitored = monitored;
            businessObject.kei = kei;
            this.ensureKEIExtensionElements(businessObject, { kei, monitored });
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

    actions['replace'] = {
      group: 'edit',
      className: 'bpmn-icon-screw-wrench',
      title: translate('Change element'),
      action: {
        click: (event, element) => {
          console.log('event:', event);
          console.log('Replacing element');
          const businessObject = element.businessObject;

          // Preserve KEI properties before replacement
          const keiProperties = {
            kei: businessObject.kei,
            energyConsumption: businessObject.energyConsumption,
            renewableEnergy: businessObject.renewableEnergy,
            nonRenewableEnergy: businessObject.nonRenewableEnergy,
            indoorEnergy: businessObject.indoorEnergy,
            transportationEnergy: businessObject.transportationEnergy,
            singleSourceOfEnergy: businessObject.singleSourceOfEnergy,
            carbonDioxideEmissions: businessObject.carbonDioxideEmissions,
            waterUsage: businessObject.waterUsage,
            wasteGeneration: businessObject.wasteGeneration,
            monitored: businessObject.monitored
          };

          const position = assign(getReplaceMenuPosition(element), {
            cursor: { x: event.x, y: event.y }
          //print position for debugging
       
          });
          console.log('Position:', position);
          popupMenu.open(element, 'bpmn-replace', position, {
            title: translate('Change element'),
            width: 300,
            search: true
          });
          //print element
          console.log('Elementtype:', element);
          // Listen for the replace event and reapply KEI properties to the new element
          const onReplace = ({ context }) => {
            const { newShape } = context;
            const newBusinessObject = newShape.businessObject;
            assign(newBusinessObject, keiProperties);
            console.log('New business object:', newBusinessObject);
            this.ensureKEIExtensionElements(newBusinessObject, keiProperties);
            this.modeling.updateProperties(newShape, { businessObject: newBusinessObject });
            this.eventBus.off('replace', onReplace); // Unsubscribe after handling
          };
          this.eventBus.on('replace', onReplace);
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
  'elementRegistry',
  'popupMenu'
];

function getReplaceMenuPosition(element) {
  const Y_OFFSET = 5;
  const bbox = element.businessObject.di.bounds;
  return {
    x: bbox.x + bbox.width / 2,
    y: bbox.y + bbox.height + Y_OFFSET
  };
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
