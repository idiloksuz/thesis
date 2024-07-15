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
        'Energy consumption': '#52B415',
        'Carbon-dioxide emissions': '#ffc800',
        'Water usage': '#cc0000',
        'Waste generation': '#8a2be2',
        'Resource efficiency': '#ff6347',
      };

export default class CustomRenderer extends BaseRenderer {
  constructor(eventBus, bpmnRenderer) {
    super(eventBus, HIGH_PRIORITY);
    this.bpmnRenderer = bpmnRenderer;
  }

  canRender(element) {
    return is(element, 'bpmn:Task') && element.businessObject.kei === 'Energy consumption';
  }

  drawShape(parentNode, element) {
    const shape = this.bpmnRenderer.drawShape(parentNode, element);

    if (element.businessObject.kei === 'Energy consumption') {
      const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '/Users/idiloksuz/Desktop/bp/public/energyConsumption.jpg'); // Adjust the path to your image
      img.setAttributeNS(null, 'x', element.width - 24);
      img.setAttributeNS(null, 'y', 0);
      img.setAttributeNS(null, 'width', 24);
      img.setAttributeNS(null, 'height', 24);
      parentNode.appendChild(img);

      // Add kWh text
      const text = svgCreate('text');
      svgAttr(text, {
        x: element.width - 24,
        y: 20,
        'font-size': '12px',
        fill: 'black'
      });
      text.textContent = `${element.businessObject.energyConsumption} kWh`;
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

CustomRenderer.$inject = ['eventBus', 'bpmnRenderer'];

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
