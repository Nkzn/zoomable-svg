import React, { Component } from 'react';
import { View, PanResponder } from 'react-native';
// Based on https://gist.github.com/evgen3188/db996abf89e2105c35091a3807b7311d

function calcDistance(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

function middle(p1, p2) {
  return (p1 + p2) / 2;
}

function calcCenter(x1, y1, x2, y2) {
  return {
    x: middle(x1, x2),
    y: middle(y1, y2),
  };
}

function getAlignment(align) {
  switch (align) {
    case 'min':
    case 'start':
      return 'xMinYMin';

    case 'mid':
      return 'xMidYMid';

    case 'max':
    case 'end':
      return 'xMaxYMax';

    default:
      return align || 'xMidYMid';
  }
}

const MOS_MEET = 0;
const MOS_SLICE = 1;
const MOS_NONE = 2;

const meetOrSliceMap = {
  meet: MOS_MEET,
  slice: MOS_SLICE,
  none: MOS_NONE,
};

function getTransform(vbRect, eRect, align, meetOrSlice) {
  // based on https://svgwg.org/svg2-draft/coords.html#ComputingAViewportsTransform

  // Let vb-x, vb-y, vb-width, vb-height be the min-x, min-y, width and height values of the viewBox attribute respectively.
  const vbX = vbRect.left || 0;
  const vbY = vbRect.top || 0;
  const vbWidth = vbRect.width;
  const vbHeight = vbRect.height;

  // Let e-x, e-y, e-width, e-height be the position and size of the element respectively.
  const eX = eRect.left || 0;
  const eY = eRect.top || 0;
  const eWidth = eRect.width;
  const eHeight = eRect.height;

  // Initialize scale-x to e-width/vb-width.
  let scaleX = eWidth / vbWidth;

  // Initialize scale-y to e-height/vb-height.
  let scaleY = eHeight / vbHeight;

  // Initialize translate-x to e-x - (vb-x * scale-x).
  // Initialize translate-y to e-y - (vb-y * scale-y).
  let translateX = eX - vbX * scaleX;
  let translateY = eY - vbY * scaleY;

  // If align is 'none'
  if (meetOrSlice === MOS_NONE) {
    // Let scale be set the smaller value of scale-x and scale-y.
    // Assign scale-x and scale-y to scale.
    const scale = (scaleX = scaleY = Math.min(scaleX, scaleY));

    // If scale is greater than 1
    if (scale > 1) {
      // Minus translateX by (eWidth / scale - vbWidth) / 2
      // Minus translateY by (eHeight / scale - vbHeight) / 2
      translateX -= (eWidth / scale - vbWidth) / 2;
      translateY -= (eHeight / scale - vbHeight) / 2;
    } else {
      translateX -= (eWidth - vbWidth * scale) / 2;
      translateY -= (eHeight - vbHeight * scale) / 2;
    }
  } else {
    // If align is not 'none' and meetOrSlice is 'meet', set the larger of scale-x and scale-y to the smaller.
    // Otherwise, if align is not 'none' and meetOrSlice is 'slice', set the smaller of scale-x and scale-y to the larger.

    if (align !== 'none' && meetOrSlice === MOS_MEET) {
      scaleX = scaleY = Math.min(scaleX, scaleY);
    } else if (align !== 'none' && meetOrSlice === MOS_SLICE) {
      scaleX = scaleY = Math.max(scaleX, scaleY);
    }

    // If align contains 'xMid', add (e-width - vb-width * scale-x) / 2 to translate-x.
    if (align.includes('xMid')) {
      translateX += (eWidth - vbWidth * scaleX) / 2;
    }

    // If align contains 'xMax', add (e-width - vb-width * scale-x) to translate-x.
    if (align.includes('xMax')) {
      translateX += eWidth - vbWidth * scaleX;
    }

    // If align contains 'yMid', add (e-height - vb-height * scale-y) / 2 to translate-y.
    if (align.includes('YMid')) {
      translateY += (eHeight - vbHeight * scaleY) / 2;
    }

    // If align contains 'yMax', add (e-height - vb-height * scale-y) to translate-y.
    if (align.includes('YMax')) {
      translateY += eHeight - vbHeight * scaleY;
    }
  }

  // The transform applied to content contained by the element is given by
  // translate(translate-x, translate-y) scale(scale-x, scale-y).
  return { translateX, translateY, scaleX, scaleY, eRect };
}

function getNextState(props, state) {
  const {
    top,
    left,
    zoom,
    align,
    width,
    height,
    vbWidth,
    vbHeight,
    meetOrSlice = 'meet',
    eRect = { width, height },
    vbRect = { width: vbWidth || width, height: vbHeight || height },
  } = props;
  const { top: currTop, left: currLeft, zoom: currZoom } = state;
  return {
    top: top || currTop,
    left: left || currLeft,
    zoom: zoom || currZoom,
    ...getTransform(
      vbRect,
      eRect,
      getAlignment(align),
      meetOrSliceMap[meetOrSlice],
    ),
  };
}

function getZoomTransform({
  left,
  top,
  zoom,
  scaleX,
  scaleY,
  translateX,
  translateY,
}) {
  return {
    translateX: left + zoom * translateX,
    translateY: top + zoom * translateY,
    scaleX: zoom * scaleX,
    scaleY: zoom * scaleY,
  };
}

export default class ZoomableSvg extends Component {
  constructor(props) {
    super();
    this.state = getNextState(props, {
      zoom: 1,
      left: 0,
      top: 0,
    });
  }

  componentWillReceiveProps(nextProps) {
    this.setState(getNextState(nextProps, this.state));
  }

  constrainExtent({ zoom, left, top }) {
    const {
      constrain: {
        scaleExtent: [minZoom, maxZoom] = [0, Infinity],
        translateExtent: [min, max] = [
          [-Infinity, -Infinity],
          [Infinity, Infinity],
        ],
      },
    } = this.props;

    const constrainedZoom = Math.max(minZoom, Math.min(maxZoom, zoom));

    const { translateX, translateY, scaleX, scaleY } = getZoomTransform({
      ...this.state,
      zoom: constrainedZoom,
      left,
      top,
    });

    // Width and height of canvas in native device
    const { eRect: { width, height } } = this.state;

    // Requested top left corner, width and height in root coordinates
    const vl = -translateX / scaleX;
    const vt = -translateY / scaleY;

    const vw = width / scaleX;
    const vh = height / scaleY;

    // Constraints
    const [minX, minY] = min;
    const [maxX, maxY] = max;

    // Extent of constraints
    const ew = maxX - minX;
    const eh = maxY - minY;

    // Amount of free space when zoomed out beyond a translateExtent
    const fx = Math.max(0, vw - ew);
    const fy = Math.max(0, vh - eh);

    // Correction of top-left corner
    const dx0 = Math.max(vl, minX - fx);
    const dy0 = Math.max(vt, minY - fy);

    // Correction of bottom-right corner
    const dx1 = Math.min(vl, maxX - vw + fx);
    const dy1 = Math.min(vt, maxY - vh + fy);

    // Handle zooming out beyond translateExtent (if scaleExtent allows it)
    const x =
      dx1 > dx0 ? (dx0 + dx1) / 2 : Math.min(0, dx0) || Math.max(0, dx1);
    const y =
      dy1 > dy0 ? (dy0 + dy1) / 2 : Math.min(0, dy0) || Math.max(0, dy1);

    // Return corrected transform
    return {
      zoom: constrainedZoom,
      left: left + (vl - x) * scaleX,
      top: top + (vt - y) * scaleY,
    };
  }

  processPinch(x1, y1, x2, y2) {
    const distance = calcDistance(x1, y1, x2, y2);
    const { x, y } = calcCenter(x1, y1, x2, y2);

    if (!this.state.isZooming) {
      const { top, left, zoom } = this.state;
      this.setState({
        isZooming: true,
        initialX: x,
        initialY: y,
        initialTop: top,
        initialLeft: left,
        initialZoom: zoom,
        initialDistance: distance,
      });
    } else {
      const {
        initialX,
        initialY,
        initialTop,
        initialLeft,
        initialZoom,
        initialDistance,
      } = this.state;
      const { constrain } = this.props;

      const touchZoom = distance / initialDistance;
      const dx = x - initialX;
      const dy = y - initialY;

      const left = (initialLeft + dx - x) * touchZoom + x;
      const top = (initialTop + dy - y) * touchZoom + y;
      const zoom = initialZoom * touchZoom;

      const nextState = {
        zoom,
        left,
        top,
      };

      this.setState(constrain ? this.constrainExtent(nextState) : nextState);
    }
  }

  processTouch(x, y) {
    if (!this.state.isMoving || this.state.isZooming) {
      const { top, left } = this.state;
      this.setState({
        isMoving: true,
        isZooming: false,
        initialLeft: left,
        initialTop: top,
        initialX: x,
        initialY: y,
      });
    } else {
      const { initialX, initialY, initialLeft, initialTop, zoom } = this.state;
      const { constrain } = this.props;

      const dx = x - initialX;
      const dy = y - initialY;

      const nextState = {
        left: initialLeft + dx,
        top: initialTop + dy,
        zoom,
      };

      this.setState(constrain ? this.constrainExtent(nextState) : nextState);
    }
  }

  componentWillMount() {
    const noop = () => {};
    const yes = () => true;
    const moveThreshold = this.props.moveThreshold || 5;
    const shouldRespond = (evt, { dx, dy }) => {
      return (
        evt.nativeEvent.touches.length === 2 ||
        dx * dx + dy * dy >= moveThreshold
      );
    };
    this._panResponder = PanResponder.create({
      onPanResponderGrant: noop,
      onPanResponderTerminate: noop,
      onShouldBlockNativeResponder: yes,
      onPanResponderTerminationRequest: yes,
      onMoveShouldSetPanResponder: shouldRespond,
      onStartShouldSetPanResponder: shouldRespond,
      onMoveShouldSetPanResponderCapture: shouldRespond,
      onStartShouldSetPanResponderCapture: shouldRespond,
      onPanResponderMove: ({ nativeEvent: { touches } }) => {
        const { length } = touches;
        if (length === 1) {
          const [{ pageX, pageY }] = touches;
          this.processTouch(pageX, pageY);
        } else if (length === 2) {
          const [touch1, touch2] = touches;
          this.processPinch(
            touch1.pageX,
            touch1.pageY,
            touch2.pageX,
            touch2.pageY
          );
        }
      },
      onPanResponderRelease: () => {
        this.setState({
          isZooming: false,
          isMoving: false,
        });
      },
    });
  }

  render() {
    const { svgRoot: Child, childProps } = this.props;
    return (
      <View {...this._panResponder.panHandlers}>
        <Child transform={getZoomTransform(this.state)} {...childProps} />
      </View>
    );
  }
}
