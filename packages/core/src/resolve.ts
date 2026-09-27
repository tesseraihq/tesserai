import { pickMostSpecific, type ModeContext, type ModeSelector } from "./modes";
import {
  isTokenRef,
  refPath,
  type ColorValue,
  type CubicBezierValue,
  type DimensionValue,
  type DurationValue,
  type Token,
  type TokenRef,
  type TokenType,
} from "./tokens";

export type ConcreteShadowLayer = {
  offsetX: DimensionValue;
  offsetY: DimensionValue;
  blur: DimensionValue;
  spread: DimensionValue;
  color: ColorValue;
  inset?: boolean;
};

export type ConcreteTypography = {
  fontFamily: string[];
  fontSize: DimensionValue;
  fontWeight: number;
  lineHeight: number;
  letterSpacing?: DimensionValue;
};

export type ConcreteValue = {
  color: ColorValue;
  dimension: DimensionValue;
  number: number;
  fontFamily: string[];
  fontWeight: number;
  duration: DurationValue;
  cubicBezier: CubicBezierValue;
  shadow: ConcreteShadowLayer[];
  typography: ConcreteTypography;
};

type ResolvedMap = {
  [K in TokenType]: {
    $type: K;
    $value: ConcreteValue[K];
    path: string;
    // Token paths followed by reference to reach the concrete value, nearest first.
    via: string[];
  };
};
export type Resolved<T extends TokenType = TokenType> = ResolvedMap[T];

type BodyMap = { [K in TokenType]: Omit<ResolvedMap[K], "path"> };
type Body = BodyMap[TokenType];

export function isResolvedOf<T extends TokenType>(resolved: Resolved, type: T): resolved is Resolved<T> {
  return resolved.$type === type;
}

export type ResolveErrorCode = "missing" | "cycle" | "type-mismatch";

export class TokenResolveError extends Error {
  constructor(
    readonly code: ResolveErrorCode,
    readonly path: string,
    message: string,
  ) {
    super(message);
    this.name = "TokenResolveError";
  }
}

type Tokens = ReadonlyMap<string, Token>;
type Follow = <F extends TokenType>(ref: TokenRef, type: F) => Resolved<F>;

// The value a token contributes in a context, before references are followed.
export function chooseValue<V>(
  base: V,
  modes: readonly { selector: ModeSelector; value: V }[] | undefined,
  context: ModeContext,
): V {
  return pickMostSpecific(modes ?? [], context)?.value ?? base;
}

function viaOf(inner: Resolved): string[] {
  return [inner.path, ...inner.via];
}

// The token with its $value replaced by the value it contributes in `context`, references intact.
// One case per type keeps $type and $value correlated without a cast.
export function tokenInContext(token: Token, context: ModeContext): Token {
  switch (token.$type) {
    case "color":
      return { ...token, $value: chooseValue(token.$value, token.$modes, context) };
    case "dimension":
      return { ...token, $value: chooseValue(token.$value, token.$modes, context) };
    case "number":
      return { ...token, $value: chooseValue(token.$value, token.$modes, context) };
    case "fontFamily":
      return { ...token, $value: chooseValue(token.$value, token.$modes, context) };
    case "fontWeight":
      return { ...token, $value: chooseValue(token.$value, token.$modes, context) };
    case "duration":
      return { ...token, $value: chooseValue(token.$value, token.$modes, context) };
    case "cubicBezier":
      return { ...token, $value: chooseValue(token.$value, token.$modes, context) };
    case "shadow":
      return { ...token, $value: chooseValue(token.$value, token.$modes, context) };
    case "typography":
      return { ...token, $value: chooseValue(token.$value, token.$modes, context) };
  }
}

function resolveBody(token: Token, context: ModeContext, follow: Follow): Body {
  switch (token.$type) {
    case "color": {
      const v = chooseValue(token.$value, token.$modes, context);
      if (isTokenRef(v)) {
        const r = follow(v, "color");
        return { $type: "color", $value: r.$value, via: viaOf(r) };
      }
      return { $type: "color", $value: v, via: [] };
    }
    case "dimension": {
      const v = chooseValue(token.$value, token.$modes, context);
      if (isTokenRef(v)) {
        const r = follow(v, "dimension");
        return { $type: "dimension", $value: r.$value, via: viaOf(r) };
      }
      return { $type: "dimension", $value: v, via: [] };
    }
    case "number": {
      const v = chooseValue(token.$value, token.$modes, context);
      if (isTokenRef(v)) {
        const r = follow(v, "number");
        return { $type: "number", $value: r.$value, via: viaOf(r) };
      }
      return { $type: "number", $value: v, via: [] };
    }
    case "fontFamily": {
      const v = chooseValue(token.$value, token.$modes, context);
      if (isTokenRef(v)) {
        const r = follow(v, "fontFamily");
        return { $type: "fontFamily", $value: r.$value, via: viaOf(r) };
      }
      return { $type: "fontFamily", $value: v, via: [] };
    }
    case "fontWeight": {
      const v = chooseValue(token.$value, token.$modes, context);
      if (isTokenRef(v)) {
        const r = follow(v, "fontWeight");
        return { $type: "fontWeight", $value: r.$value, via: viaOf(r) };
      }
      return { $type: "fontWeight", $value: v, via: [] };
    }
    case "duration": {
      const v = chooseValue(token.$value, token.$modes, context);
      if (isTokenRef(v)) {
        const r = follow(v, "duration");
        return { $type: "duration", $value: r.$value, via: viaOf(r) };
      }
      return { $type: "duration", $value: v, via: [] };
    }
    case "cubicBezier": {
      const v = chooseValue(token.$value, token.$modes, context);
      if (isTokenRef(v)) {
        const r = follow(v, "cubicBezier");
        return { $type: "cubicBezier", $value: r.$value, via: viaOf(r) };
      }
      return { $type: "cubicBezier", $value: v, via: [] };
    }
    case "shadow": {
      const v = chooseValue(token.$value, token.$modes, context);
      if (isTokenRef(v)) {
        const r = follow(v, "shadow");
        return { $type: "shadow", $value: r.$value, via: viaOf(r) };
      }
      const dim = (x: TokenRef | DimensionValue) => (isTokenRef(x) ? follow(x, "dimension").$value : x);
      const value = v.map((layer) => {
        const out: ConcreteShadowLayer = {
          offsetX: dim(layer.offsetX),
          offsetY: dim(layer.offsetY),
          blur: dim(layer.blur),
          spread: dim(layer.spread),
          color: isTokenRef(layer.color) ? follow(layer.color, "color").$value : layer.color,
        };
        if (layer.inset !== undefined) out.inset = layer.inset;
        return out;
      });
      return { $type: "shadow", $value: value, via: [] };
    }
    case "typography": {
      const v = chooseValue(token.$value, token.$modes, context);
      if (isTokenRef(v)) {
        const r = follow(v, "typography");
        return { $type: "typography", $value: r.$value, via: viaOf(r) };
      }
      const value: ConcreteTypography = {
        fontFamily: isTokenRef(v.fontFamily) ? follow(v.fontFamily, "fontFamily").$value : v.fontFamily,
        fontSize: isTokenRef(v.fontSize) ? follow(v.fontSize, "dimension").$value : v.fontSize,
        fontWeight: isTokenRef(v.fontWeight) ? follow(v.fontWeight, "fontWeight").$value : v.fontWeight,
        lineHeight: isTokenRef(v.lineHeight) ? follow(v.lineHeight, "number").$value : v.lineHeight,
      };
      if (v.letterSpacing !== undefined) {
        value.letterSpacing = isTokenRef(v.letterSpacing)
          ? follow(v.letterSpacing, "dimension").$value
          : v.letterSpacing;
      }
      return { $type: "typography", $value: value, via: [] };
    }
  }
}

function resolveInner(
  tokens: Tokens,
  path: string,
  context: ModeContext,
  stack: string[],
  expectType: TokenType | undefined,
): Resolved {
  if (stack.includes(path)) {
    throw new TokenResolveError("cycle", path, `reference cycle: ${[...stack, path].join(" -> ")}`);
  }
  const token = tokens.get(path);
  if (token === undefined) {
    const from = stack.at(-1);
    throw new TokenResolveError(
      "missing",
      path,
      from === undefined ? `token ${path} does not exist` : `${from} references ${path}, which does not exist`,
    );
  }
  if (expectType !== undefined && token.$type !== expectType) {
    throw new TokenResolveError(
      "type-mismatch",
      path,
      `${stack.at(-1) ?? path} expected a ${expectType} token but ${path} is ${token.$type}`,
    );
  }

  const next = [...stack, path];
  const follow: Follow = (ref, type) => {
    const inner = resolveInner(tokens, refPath(ref), context, next, type);
    if (!isResolvedOf(inner, type)) {
      throw new TokenResolveError("type-mismatch", inner.path, `${path} expected ${type}, got ${inner.$type}`);
    }
    return inner;
  };

  return { ...resolveBody(token, context, follow), path };
}

export function resolveToken(tokens: Tokens, path: string, context: ModeContext): Resolved;
export function resolveToken<T extends TokenType>(
  tokens: Tokens,
  path: string,
  context: ModeContext,
  expectType: T,
): Resolved<T>;
export function resolveToken(
  tokens: Tokens,
  path: string,
  context: ModeContext,
  expectType?: TokenType,
): Resolved {
  return resolveInner(tokens, path, context, [], expectType);
}

export type ResolveAllResult = {
  values: Map<string, Resolved>;
  errors: Map<string, TokenResolveError>;
};

export function resolveAll(tokens: Tokens, context: ModeContext): ResolveAllResult {
  const values = new Map<string, Resolved>();
  const errors = new Map<string, TokenResolveError>();
  for (const path of tokens.keys()) {
    try {
      values.set(path, resolveToken(tokens, path, context));
    } catch (error) {
      if (error instanceof TokenResolveError) errors.set(path, error);
      else throw error;
    }
  }
  return { values, errors };
}
