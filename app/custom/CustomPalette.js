export default class CustomPalette {
  constructor(bpmnFactory, create, elementFactory, palette, translate, modeling, elementRegistry, eventBus) {
    this.bpmnFactory = bpmnFactory;
    this.create = create;
    this.elementFactory = elementFactory;
    this.translate = translate;
    this.modeling = modeling;
    this.elementRegistry = elementRegistry;
    this.eventBus = eventBus;

    palette.registerProvider(this);
  }

  getPaletteEntries(element) {
    const {
      bpmnFactory,
      create,
      elementFactory,
      translate,
      modeling,
      elementRegistry,
      eventBus
    } = this;

    // Define custom palette entries
    const entries = {
      'replace-task': {
        group: 'edit',
        className: 'bpmn-icon-screw-wrench',
        title: translate('Change element'),
        action: {
          dragstart: function (event) {
            // Handle dragstart if necessary
          },
          click: (event) => {
            const shape = element;
            const newType = 'bpmn:ServiceTask'; // Specify the new type

            this.replaceElement(shape, newType);
          }
        }
      },
      // Add other palette entries as needed
    };

    return entries;
  }

  replaceElement(element, newType) {
    const businessObject = element.businessObject;

    // Store KEI properties
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

    console.log('Replacing element, storing KEI Properties:', keiProperties);

    // Create a new element of the specified type
    const newElement = this.elementFactory.createShape({
      type: newType,
      businessObject: this.bpmnFactory.create(newType)
    });

    // Assign KEI properties to the new element's businessObject
    assign(newElement.businessObject, keiProperties);

    // Replace the old element with the new element
    this.modeling.replaceShape(element, newElement);

    // Ensure KEI extension elements are correctly handled during the replacement
    this.ensureKEIExtensionElements(newElement.businessObject, keiProperties);

    // Fire element changed event
    this.eventBus.fire('element.changed', { element: newElement });
  } ensureKEIExtensionElements(businessObject, keiProperties) {
    const moddle = this.bpmnModeler.get('moddle');
    let extensionElements = businessObject.extensionElements;

    // Ensure that extensionElements exists on the businessObject
    if (!extensionElements) {
      extensionElements = moddle.create('bpmn:ExtensionElements');
      businessObject.extensionElements = extensionElements;
    }

    // Initialize the values array if it doesn't exist
    if (!extensionElements.values) {
      extensionElements.values = [];
    }

    // Remove all existing KEI-specific elements before adding the new one
    extensionElements.values = extensionElements.values.filter(el => el.$type === 'sm:Kei' || !el.$type.startsWith('sm:'));

    // Ensure the KEI main element exists or create it
    let keiElement = extensionElements.get('values').find(el => el.$type === 'sm:Kei');
    if (!keiElement) {
      keiElement = moddle.create('sm:Kei', { value: keiProperties.kei });
      extensionElements.get('values').push(keiElement);
    } else {
      keiElement.value = keiProperties.kei;
    }

    // Update the monitored attribute if needed
    if (keiProperties.monitored) {
      keiElement.monitored = 'true';
    } else {
      delete keiElement.monitored;
    }

    // Handle specific KEI elements based on the keiProperties
    const measured = keiProperties.measured;
    this.handleKEIElement('Energy consumption', 'sm:EnergyConsumption', businessObject, 'energyConsumption', 'kWh', keiProperties.monitored, measured, moddle, extensionElements);
    this.handleKEIElement('Renewable energy', 'sm:RenewableEnergy', businessObject, 'renewableEnergy', 'kWh', keiProperties.monitored, measured, moddle, extensionElements);
    this.handleKEIElement('Non-Renewable energy', 'sm:NonRenewableEnergy', businessObject, 'nonRenewableEnergy', 'kWh', keiProperties.monitored, measured, moddle, extensionElements);
    this.handleKEIElement('Indoor energy', 'sm:IndoorEnergy', businessObject, 'indoorEnergy', 'kWh', keiProperties.monitored, measured, moddle, extensionElements);
    this.handleKEIElement('Transportation energy', 'sm:TransportationEnergy', businessObject, 'transportationEnergy', 'kWh', keiProperties.monitored, measured, moddle, extensionElements);
    this.handleKEIElement('[Single source of energy]', 'sm:SingleSourceOfEnergy', businessObject, 'singleSourceOfEnergy', 'kWh', keiProperties.monitored, measured, moddle, extensionElements);
    this.handleKEIElement('Carbondioxide emissions', 'sm:CarbonDioxideEmissions', businessObject, 'carbonDioxideEmissions', 'kg', keiProperties.monitored, measured, moddle, extensionElements);
    this.handleKEIElement('Water usage', 'sm:WaterUsage', businessObject, 'waterUsage', 'liters', keiProperties.monitored, measured, moddle, extensionElements);
    this.handleKEIElement('Waste generation', 'sm:WasteGeneration', businessObject, 'wasteGeneration', 'kg', keiProperties.monitored, measured, moddle, extensionElements);
  }
  handleKEIElement(keiType, elementType, businessObject, property, unit, monitored, measured, moddle, extensionElements) {
    if (businessObject.kei === keiType) {
      let keiElement = extensionElements.get('values').find(el => el.$type === elementType);
  
      const keiValue = measured ? businessObject[property] : null;
      const shouldCreateOrUpdate = keiValue || unit || monitored;
  
      if (shouldCreateOrUpdate) {
        if (!keiElement) {
          keiElement = moddle.create(elementType, {});
          extensionElements.get('values').push(keiElement);
        }
  
        if (keiValue) {
          keiElement.value = keiValue;
        } else {
          delete keiElement.value;
        }
  
        if (unit) {
          keiElement.unit = unit;
        } else {
          delete keiElement.unit;
        }
  
        if (monitored) {
          keiElement.monitored = 'true';
        } else {
          delete keiElement.monitored;
        }
      } else if (keiElement) {
        extensionElements.get('values').splice(extensionElements.get('values').indexOf(keiElement), 1);
      }
    }
  }
  
}

CustomPalette.$inject = [
  'bpmnFactory',
  'create',
  'elementFactory',
  'palette',
  'translate',
  'modeling',
  'elementRegistry',
  'eventBus'
];