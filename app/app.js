import BpmnModeler from 'bpmn-js/lib/Modeler';
import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil';
import CustomPalette from '/Users/idiloksuz/Desktop/bp/app/custom/CustomPalette.js';
import CustomContextPad from '/Users/idiloksuz/Desktop/bp/app/custom/CustomContextPad.js';
import CustomRenderer from '/Users/idiloksuz/Desktop/bp/app/custom/CustomRenderer.js';
import diagramXML from '../resources/diagram.bpmn';
import customModule from './custom';
import smExtension from '../resources/sm';
import { saveAs } from 'file-saver';

const HIGH_PRIORITY = 1500;

  const keis = [
    "Energy consumption",
    "Carbondioxide emissions",
    "Water usage",
    "Waste generation",
  ];

document.addEventListener('DOMContentLoaded', () => {
  const containerEl = document.getElementById('container');
  const formEl = document.getElementById('form');
  const sustainabilityMetricsEl = document.getElementById('sustainability-metrics');
  const keisEl = document.getElementById('keis');
  const okayEl = document.getElementById('okay');
  const warningEl = document.getElementById('warning');
  const saveButtonEl = document.getElementById('save-button');
  let currentElement, businessObject;


  // Populate KEIs dropdown
  keis.forEach(kei => {
    const option = document.createElement('option');
    option.value = kei;
    option.textContent = kei;
    keisEl.appendChild(option);
  });

  // Hide sustainability metrics if user clicks outside
  window.addEventListener('click', (event) => {
    const { target } = event;
    if (target === sustainabilityMetricsEl || sustainabilityMetricsEl.contains(target)) {
      return;
    }
    sustainabilityMetricsEl.classList.add('hidden');
  });

  // Validation function
  function validate() {
    const value = keisEl.value;
    if (!value) {
      warningEl.classList.remove('hidden');
      okayEl.disabled = true;
    } else {
      warningEl.classList.add('hidden');
      okayEl.disabled = false;
    }
  }

  const bpmnModeler = new BpmnModeler({
    container: '#container',
    additionalModules: [
      customModule,
      {
        __init__: ['customPalette', 'customContextPad', 'customRenderer'],
        customPalette: ['type', CustomPalette],
        customContextPad: ['type', CustomContextPad],
        customRenderer: ['type', CustomRenderer]
      }
    ],
    moddleExtensions: {
      sm: smExtension
    }
  });

  bpmnModeler.importXML(diagramXML, (err) => {
    if (err) {
      console.error('Failed to import diagram', err);
    } else {
      console.log('Diagram imported successfully');
      // Set bpmnModeler to CustomContextPad instance
      const customContextPad = bpmnModeler.get('customContextPad');
      customContextPad.setBpmnModeler(bpmnModeler);
    }
  });

  document.getElementById('save-button').addEventListener('click', (e) => {
    e.preventDefault();
    bpmnModeler.saveXML({ format: true }).then(result => {
      const blob = new Blob([result.xml], { type: 'application/xml' });
      saveAs(blob, 'diagram.bpmn');
    }).catch(err => console.error(err));
  });

  // Open sustainability metrics if user right clicks on element
  bpmnModeler.on('element.contextmenu', HIGH_PRIORITY, (event) => {
    event.originalEvent.preventDefault();
    event.originalEvent.stopPropagation();

    sustainabilityMetricsEl.classList.remove('hidden');

    currentElement = event.element;

    // Ignore root element
    if (!currentElement.parent) {
      return;
    }

    businessObject = getBusinessObject(currentElement);
    const selectedKEI = businessObject.kei || '';

    keisEl.value = selectedKEI;
    keisEl.focus();
    validate();
  });

  // Save button click event
  saveButtonEl.addEventListener('click', (e) => {
    e.preventDefault();
    bpmnModeler.saveXML({ format: true }).then(result => {
      const blob = new Blob([result.xml], { type: 'application/xml' });
      saveAs(blob, 'diagram.bpmn');
    }).catch(err => console.error(err));
  });

  function getBusinessObject(element) {
    return element.businessObject || element;
  }
});
