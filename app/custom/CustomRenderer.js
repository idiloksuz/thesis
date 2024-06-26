import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import {
  append as svgAppend,
  attr as svgAttr,
  create as svgCreate
} from 'tiny-svg';
import { getRoundRectPath } from 'bpmn-js/lib/draw/BpmnRenderUtil';
import { is, getBusinessObject } from 'bpmn-js/lib/util/ModelUtil';

const HIGH_PRIORITY = 1500,
      TASK_BORDER_RADIUS = 2,
      COLOR_MAP = {
        'Total energy': '#52B415',
        'Renewable energy': '#ffc800',
        'Non-Renewable energy': '#cc0000',
        'Indoor energy': '#8a2be2',
        'Transportation energy': '#ff6347',
        'Total waste': '#6b8e23',
        'Recyclable waste': '#3cb371',
        'Non-Recyclable waste': '#d2691e',
        'Hazardous waste': '#ff4500',
        'Total water withdrawal': '#4682b4',
        'Water Non-consumptive use': '#5f9ea0',
        'Water Use': '#00ced1',
        'Water Pollution': '#1e90ff',
        'Total emissions to air': '#2e8b57',
        'GHGs emissions': '#32cd32',
        'CO2 emissions': '#9acd32',
        'NOx and SOx emissions': '#adff2f'
      };

export default class CustomRenderer extends BaseRenderer {
  constructor(eventBus, bpmnRenderer) {
    super(eventBus, HIGH_PRIORITY);
    this.bpmnRenderer = bpmnRenderer;
  }

  canRender(element) {
    // ignore labels
    return !element.labelTarget;
  }

  drawShape(parentNode, element) {
    const shape = this.bpmnRenderer.drawShape(parentNode, element);
    const businessObject = getBusinessObject(element);
    const kei = businessObject.kei;

    if (kei) {
      const color = this.getColor(kei);
      const rect = drawRect(parentNode, 150, 20, TASK_BORDER_RADIUS, color);

      svgAttr(rect, {
        transform: 'translate(-70, -10)'
      });

      const text = svgCreate('text');
      svgAttr(text, {
        fill: '#fff',
        transform: 'translate(-65, 5)'
      });

      svgAppend(text, document.createTextNode(kei));
      svgAppend(parentNode, text);
    }

    return shape;
  }

  getShapePath(shape) {
    if (is(shape, 'bpmn:Task')) {
      return getRoundRectPath(shape, TASK_BORDER_RADIUS);
    }
    return this.bpmnRenderer.getShapePath(shape);
  }

  getColor(kei) {
    return COLOR_MAP[kei] || '#000';
  }
}

CustomRenderer.$inject = [ 'eventBus', 'bpmnRenderer' ];

function drawRect(parentNode, width, height, borderRadius, color) {
  const rect = svgCreate('rect');

  svgAttr(rect, {
    width: width,
    height: height,
    rx: borderRadius,
    ry: borderRadius,
    stroke: color,
    strokeWidth: 2,
    fill: color
  });

  svgAppend(parentNode, rect);
  return rect;
}
