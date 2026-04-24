/**
 * ComponentRegistry — maps event type strings to React component types.
 *
 * Intentionally typed loosely here (React.ComponentType<any>) so the core
 * package has zero React dependency. The react-native package tightens this.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyComponent = (props: any) => unknown

export type ComponentRegistry = Record<string, AnyComponent>

/**
 * HandlerRegistry — maps event type strings to side-effect functions.
 * These are executed instead of rendering a component.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ActionHandler = (payload: any) => void | Promise<void>

export type HandlerRegistry = Record<string, ActionHandler>

/**
 * Mutable registry that can be extended at runtime.
 */
export class Registry {
  private components: ComponentRegistry = {}
  private handlers: HandlerRegistry = {}

  registerComponent(type: string, component: AnyComponent): void {
    this.components[type] = component
  }

  registerHandler(type: string, handler: ActionHandler): void {
    this.handlers[type] = handler
  }

  getComponent(type: string): AnyComponent | undefined {
    return this.components[type]
  }

  getHandler(type: string): ActionHandler | undefined {
    return this.handlers[type]
  }

  mergeComponents(registry: ComponentRegistry): void {
    Object.assign(this.components, registry)
  }

  mergeHandlers(registry: HandlerRegistry): void {
    Object.assign(this.handlers, registry)
  }

  snapshot(): { components: ComponentRegistry; handlers: HandlerRegistry } {
    return {
      components: { ...this.components },
      handlers: { ...this.handlers },
    }
  }
}
