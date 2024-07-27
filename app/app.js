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

document.addEventListener('DOMContentLoaded', () => {
  const containerEl = document.getElementById('container');
  const saveButtonEl = document.getElementById('save-button');
  let currentElement, businessObject;

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

    currentElement = event.element;

    // Ignore root element
    if (!currentElement.parent) {
      return;
    }

    businessObject = getBusinessObject(currentElement);
  });

  function getBusinessObject(element) {
    return element.businessObject || element;
  }
});
