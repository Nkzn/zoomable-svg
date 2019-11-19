import * as React from 'react';
import * as RN from 'react-native';

export type ConstraintCombinations = 
  'none'
  | 'dynamic'
  | 'static' 
  | 'union'
  | 'intersect';

export type Constraints = {
  combine: ConstraintCombinations;
  scaleElement: [number, number],
  translateExtent: [[number, number], [number, number]];
};

export type Align =
  'min'
  | 'start'
  | 'mid'
  | 'max'
  | 'end';

export type MeetOrSlice = 'meet' | 'slice';

export type Rect = {
  width: number;
  height: number;
};

export type ZoomTransform = {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
};

export type SvgRootProps = {
  transform: ZoomTransform;
  [key: string]: any;
};

export interface Props {
  top?: number;
  left?: number;
  zoom?: number;
  align?: Align;
  width: number;
  height: number;
  vbWidth?: number;
  vbHeight?: number;
  meetOrSlice?: MeetOrSlice;
  eRect?: Rect;
  vbRect?: Rect;

  svgRoot: React.ComponentType<SvgRootProps>;
  childProps?: any;
  lock?: boolean;

  initialZoom?: number;
  initialLeft?: number;
  initialTop?: number;
  constrain?: Constraints | null;
  moveThreshold?: number;
  doubleTapThreshold?: number;
  doubleTapZoom?: number;
  wheelZoom?: number;
  style?: RN.ViewStyle;
}

export class ZoomableSvg extends React.Component<Props> {}
export default ZoomableSvg;