import type {
  Abstract,
  CanActivate,
  DynamicModule,
  ForwardReference,
  Provider,
  Type,
} from '@nestjs/common';
import { Module as Module_, UseGuards } from '@nestjs/common';
import type { Routes } from '@nestjs/core';
import { NestFactory, RouterModule } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { mainLogger } from './logger';

type NestModule =
  | Type<any>
  | DynamicModule
  | Promise<DynamicModule>
  | ForwardReference;

type NestImport = NestModule | { prefix: string; module: NestModule };

type NestExport =
  | DynamicModule
  | Promise<DynamicModule>
  | string
  | symbol
  | Provider
  | ForwardReference
  | Abstract<any>
  | Function;

type NestGuard = Type<CanActivate>;

type NestController = Type<any>;

export interface ModulePlusMetadata {
  imports?: Array<NestImport>;
  controllers?: Array<NestController>;
  providers?: Array<Provider>;
  exports?: Array<NestExport>;
}

const _moduleInfos = new Map<
  any,
  {
    parent?: NestModule;
    children?: NestModule[];
    prefix?: string;
    controllers?: NestController[];
    providers?: Provider[];
  }
>();

export function Module(metadata: ModulePlusMetadata) {
  return function (module: any) {
    // Prepare metadata

    if (metadata.controllers?.length === 0) {
      delete metadata.controllers;
    }

    metadata.imports ??= [];
    metadata.imports.push(JwtModule);

    // All module imports

    const moduleInfo = getModuleInfo(module);

    for (let i = 0; i < metadata.imports.length; i++) {
      const childImport = metadata.imports[i] as any;

      let childModule;

      if (childImport?.prefix != null) {
        childModule = childImport.module;
      } else {
        childModule = childImport;
      }

      const childData = getModuleInfo(childModule);

      moduleInfo.children ??= [];
      moduleInfo.children.push(childModule);

      childData.parent = module;
      childData.prefix = childImport?.prefix;

      metadata.imports[i] = childModule;
    }

    // RouteModule

    for (let i = 0; i < metadata.imports.length; i++) {
      if (metadata.imports[i] !== RouterModule) {
        continue;
      }

      metadata.imports[i] = RouterModule.register(_generateRoutes(module));
    }

    // Controllers

    moduleInfo.controllers = metadata.controllers;
    moduleInfo.providers = metadata.providers;

    Module_(metadata as any)(module);
  };
}

function _getDescendantModules(module: any) {
  const descendantModules: NestModule[] = [];

  const moduleInfo = getModuleInfo(module);

  for (const childModule of moduleInfo.children ?? []) {
    descendantModules.push(childModule);

    descendantModules.push(..._getDescendantModules(childModule));
  }

  return descendantModules;
}

function _getDescendantControllers(module: any) {
  const descendantModules = _getDescendantModules(module);

  const descendantControllers = getModuleInfo(module).controllers ?? [];

  for (const descendantModule of descendantModules) {
    const moduleInfo = getModuleInfo(descendantModule);

    descendantControllers.push(...(moduleInfo.controllers ?? []));
  }

  return descendantControllers;
}

export function getModuleInfo(module: any) {
  let moduleInfo = _moduleInfos.get(module);

  if (moduleInfo == null) {
    moduleInfo = {};

    _moduleInfos.set(module, moduleInfo);
  }

  return moduleInfo;
}

function _generateRoutes(module: any) {
  const children: Routes = [];

  const moduleInfo = getModuleInfo(module);

  for (const childModule of moduleInfo.children ?? []) {
    const childData = getModuleInfo(childModule);

    if (childData.prefix == null) {
      continue;
    }

    children.push({
      path: childData.prefix,
      module: childModule as any,
      children: _generateRoutes(childModule),
    });
  }

  return children;
}

// Module Guards

const _moduleGuards: { guard: NestGuard; controller: NestController }[] = [];

export function UseModuleGuard(guard: NestGuard) {
  return function (module: any) {
    const moduleControllers = _getDescendantControllers(module);

    for (const controller of moduleControllers) {
      _moduleGuards.push({ guard, controller });
    }
  };
}

// Application creation

const oldCreate = NestFactory.create;

NestFactory.create = function (rootModule: NestModule, ...args: any[]) {
  for (const { guard, controller } of _moduleGuards.slice().reverse()) {
    mainLogger().info(`Use ${guard.name} on ${controller.name}`);

    UseGuards(guard)(controller);
  }

  return oldCreate.call(this, rootModule, ...args);
};

// Testing

export function getTestModuleBuilder<T>(
  moduleClass: NestModule,
  controllerClass: Type<T>,
  providers?: Provider[],
) {
  const moduleInfo = getModuleInfo(moduleClass);

  const moduleProviders = moduleInfo.providers?.slice() ?? [];

  const moduleBuilder = Test.createTestingModule({
    imports: [JwtModule],
    controllers: [controllerClass],
    providers: [...moduleProviders, ...(providers ?? [])],
  });

  return moduleBuilder;
}

export async function getTestController<T>(
  moduleClass: NestModule,
  controllerClass: Type<T>,
  providers?: Provider[],
) {
  const module: TestingModule = await getTestModuleBuilder(
    moduleClass,
    controllerClass,
    providers,
  ).compile();

  const controller = module.get<T>(controllerClass);

  return controller;
}
