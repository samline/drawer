import type { CommonDrawerDirection, CommonDrawerSnapPoint } from './core';

export type DrawerDirection = CommonDrawerDirection;
export type DrawerSnapPoint = CommonDrawerSnapPoint;

export interface SnapPoint {
  fraction: number;
  height: number;
}

export type AnyFunction = (...args: any) => any;
