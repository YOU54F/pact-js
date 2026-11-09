import { isNil, pickBy, times } from 'ramda';
import RandExp from 'randexp';
import type { AnyJson, JsonMap } from '../common/jsonTypes';
import {
  EMAIL_FORMAT,
  HEX_FORMAT,
  IPV4_FORMAT,
  IPV6_FORMAT,
  ISO8601_DATE_FORMAT,
  ISO8601_DATETIME_FORMAT,
  ISO8601_DATETIME_WITH_MILLIS_FORMAT,
  ISO8601_TIME_FORMAT,
  RFC1123_TIMESTAMP_FORMAT,
  validateExample,
} from '../common/matcherFormats';
import type {
  ArrayContainsMatcher,
  CombinedMatcher,
  DateTimeMatcher,
  HTTPResponseStatusClass,
  Matcher,
  MatcherAlternative,
  MaxLikeMatcher,
  MinLikeMatcher,
  ProviderStateInjectedValue,
  RulesMatcher,
  StatusCodeMatcher,
  V3RegexMatcher,
} from './types';

export * from './types';
export * from '../common/matcherFormats';

export function isMatcher(x: unknown): x is Matcher<unknown> {
  return (
    x != null &&
    (x as Matcher<unknown>)['pact:matcher:type'] !== undefined &&
    (x as Matcher<unknown>).value !== undefined
  );
}

/**
 * Value must match the given template
 * @param template Template to base the comparison on
 */
export const like = <T>(template: T): Matcher<T> => ({
  'pact:matcher:type': 'type',
  value: template,
});

/**
 * Object where the key itself is ignored, but the value template must match.
 *
 * @deprecated use eachKeyMatches or eachValueMatches
 * @param keyTemplate Example key to use
 * @param template Example value template to base the comparison on
 */
export const eachKeyLike = <T>(
  keyTemplate: string,
  template: T,
): Matcher<T> => ({
  'pact:matcher:type': 'values',
  value: {
    [keyTemplate]: template,
  },
});

/**
 * Object where the _keys_ must match the supplied matchers.
 * The values for each key are ignored. That is, there can be 0 or more keys
 * with any valid JSON identifier, so long as the names of the keys match the constraints.
 *
 * @param example Example object with key/values e.g. `{ foo: 'bar', baz: 'qux'}`
 * @param matchers Matchers to apply to each key
 */
export const eachKeyMatches = (
  example: Record<string, unknown>,
  matchers: Matcher<string> | Matcher<string>[] = like('key'),
): RulesMatcher<unknown> => ({
  'pact:matcher:type': 'eachKey',
  rules: Array.isArray(matchers) ? matchers : [matchers],
  value: example,
});

/**
 * Object where the _values_ must match the supplied matchers.
 * The names of the keys are ignored. That is, there can be 0 or more keys
 * with any valid JSON identifier, so long as the values match the constraints.
 *
 * @param example Example object with key/values e.g. `{ foo: 'bar', baz: 'qux'}`
 * @param matchers Matchers to apply to each value
 */
export const eachValueMatches = <T>(
  example: Record<string, T>,
  matchers: Matcher<T> | Matcher<T>[],
): RulesMatcher<T> => ({
  'pact:matcher:type': 'eachValue',
  rules: Array.isArray(matchers) ? matchers : [matchers],
  value: example,
  // Unsure if the full object is provided, or just a template k/v pair
  // value: {
  //   [keyTemplate]: template,
  // },
});

/**
 * Matches HTTP status codes either by a class (e.g. 2XX) or a list of specific codes.
 *
 * @param example Example status code to use in consumer tests
 * @param status Allowed status codes - either an HTTPResponseStatusClass (e.g. Success for 2XX)
 *               or an array of specific status codes (e.g. [200, 201])
 */
export const matchStatus = (
  example: number,
  status: HTTPResponseStatusClass | number[],
): StatusCodeMatcher<number> => ({
  'pact:matcher:type': 'statusCode',
  status,
  value: example,
});

/**
 * Array where each element must match the given template
 * @param template Template to base the comparison on
 * @param min Minimum number of elements required in the array
 */
export const eachLike = <T>(template: T, min = 1): MinLikeMatcher<T[]> => {
  const elements = min;
  return {
    min,
    'pact:matcher:type': 'type',
    value: times(() => template, elements),
  };
};

/**
 * An array that has to have at least one element and each element must match the given template
 * @param template Template to base the comparison on
 * @param count Number of examples to generate, defaults to one
 */
export const atLeastOneLike = <T>(
  template: T,
  count = 1,
): MinLikeMatcher<T[]> => ({
  min: 1,
  'pact:matcher:type': 'type',
  value: times(() => template, count),
});

/**
 * An array that has to have at least the required number of elements and each element must match the given template
 * @param template Template to base the comparison on
 * @param min Minimum number of elements required in the array
 * @param count Number of examples to generate, defaults to min
 */
export const atLeastLike = <T>(
  template: T,
  min: number,
  count?: number,
): MinLikeMatcher<T[]> => {
  const elements = count || min;
  if (count && count < min) {
    throw new Error(
      `atLeastLike has a minimum of ${min} but ${count} elements were requested.` +
        ` Make sure the count is greater than or equal to the min.`,
    );
  }

  return {
    min,
    'pact:matcher:type': 'type',
    value: times(() => template, elements),
  };
};

/**
 * An array that has to have at most the required number of elements and each element must match the given template
 * @param template Template to base the comparison on
 * @param max Maximum number of elements required in the array
 * @param count Number of examples to generate, defaults to one
 */
export const atMostLike = <T>(
  template: T,
  max: number,
  count?: number,
): MaxLikeMatcher<T[]> => {
  const elements = count || 1;
  if (count && count > max) {
    throw new Error(
      `atMostLike has a maximum of ${max} but ${count} elements where requested.` +
        ` Make sure the count is less than or equal to the max.`,
    );
  }

  return {
    max,
    'pact:matcher:type': 'type',
    value: times(() => template, elements),
  };
};

/**
 * An array whose size is constrained to the minimum and maximum number of elements and each element must match the given template
 * @param template Template to base the comparison on
 * @param min Minimum number of elements required in the array
 * @param max Maximum number of elements required in the array
 * @param count Number of examples to generate, defaults to one
 */
export const constrainedArrayLike = <T>(
  template: T,
  min: number,
  max: number,
  count?: number,
): MinLikeMatcher<T[]> & MaxLikeMatcher<T[]> => {
  const elements = count || min;
  if (count) {
    if (count < min) {
      throw new Error(
        `constrainedArrayLike has a minimum of ${min} but ${count} elements where requested.` +
          ` Make sure the count is greater than or equal to the min.`,
      );
    } else if (count > max) {
      throw new Error(
        `constrainedArrayLike has a maximum of ${max} but ${count} elements where requested.` +
          ` Make sure the count is less than or equal to the max.`,
      );
    }
  }

  return {
    min,
    max,
    'pact:matcher:type': 'type',
    value: times(() => template, elements),
  };
};

/**
 * Value must be a boolean
 * @param b Boolean example value. Defaults to true if unsupplied
 */
export const boolean = (b = true): Matcher<boolean> => ({
  'pact:matcher:type': 'type',
  value: b,
});

/**
 * Value must be an integer (must be a number and have no decimal places)
 * @param int Example value. If omitted a random value will be generated.
 */
export const integer = (int?: number): Matcher<number> => {
  if (Number.isInteger(int)) {
    return {
      'pact:matcher:type': 'integer',
      value: int,
    };
  }
  if (int) {
    throw new Error(
      `The integer matcher was passed '${int}' which is not an integer.`,
    );
  }

  return {
    'pact:generator:type': 'RandomInt',
    'pact:matcher:type': 'integer',
    value: 101,
  };
};

/**
 * Value must be a decimal number (must be a number and have decimal places)
 * @param num Example value. If omitted a random value will be generated.
 */
export const decimal = (num?: number): Matcher<number> => {
  if (Number.isFinite(num)) {
    return {
      'pact:matcher:type': 'decimal',
      value: num,
    };
  }
  if (num) {
    throw new Error(
      `The decimal matcher was passed '${num}' which is not a number.`,
    );
  }
  return {
    'pact:generator:type': 'RandomDecimal',
    'pact:matcher:type': 'decimal',
    value: 12.34,
  };
};

/**
 * Value must be a number
 * @param num Example value. If omitted a random integer value will be generated.
 */
export function number(num?: number): Matcher<number> {
  if (typeof num === 'number') {
    return {
      'pact:matcher:type': 'number',
      value: num,
    };
  }
  if (num) {
    throw new Error(
      `The number matcher was passed '${num}' which is not a number.`,
    );
  }
  return {
    'pact:generator:type': 'RandomInt',
    'pact:matcher:type': 'number',
    value: 1234,
  };
}

/**
 * Value must be a string
 * @param str Example value
 */
export function string(str = 'some string'): Matcher<string> {
  return {
    'pact:matcher:type': 'type',
    value: str,
  };
}

/**
 * Value that must match the given regular expression
 * @param pattern Regular Expression to match
 * @param str Example value
 */
export function regex(pattern: RegExp | string, str: string): V3RegexMatcher {
  if (pattern instanceof RegExp) {
    return {
      'pact:matcher:type': 'regex',
      regex: pattern.source,
      value: str,
    };
  }
  return {
    'pact:matcher:type': 'regex',
    regex: pattern,
    value: str,
  };
}

const validatedRegex = (
  pattern: string,
  defaultExample: string,
  example?: string,
): V3RegexMatcher => {
  const value = example || defaultExample;
  if (!validateExample(value, pattern)) {
    throw new Error(
      `Example '${value}' does not match regular expression '${pattern}'`,
    );
  }
  return regex(pattern, value);
};

/** Match an email address using the V2-compatible expression. */
export const email = (address?: string): V3RegexMatcher =>
  validatedRegex(EMAIL_FORMAT, 'hello@pact.io', address);

/** Match an IPv4 address using the V2-compatible expression. */
export const ipv4Address = (ip?: string): V3RegexMatcher =>
  validatedRegex(IPV4_FORMAT, '127.0.0.13', ip);

/** Match an IPv6 address using the V2-compatible expression. */
export const ipv6Address = (ip?: string): V3RegexMatcher =>
  validatedRegex(IPV6_FORMAT, '::ffff:192.0.2.128', ip);

/** Match an ISO 8601 date and time using the V2-compatible expression. */
export const iso8601DateTime = (value?: string): V3RegexMatcher =>
  validatedRegex(ISO8601_DATETIME_FORMAT, '2015-08-06T16:53:10+01:00', value);

/** Match an ISO 8601 date and time with fractional-second precision. */
export const iso8601DateTimeWithMillis = (value?: string): V3RegexMatcher =>
  validatedRegex(
    ISO8601_DATETIME_WITH_MILLIS_FORMAT,
    '2015-08-06T16:53:10.123+01:00',
    value,
  );

/** Match an ISO 8601 date using the V2-compatible expression. */
export const iso8601Date = (value?: string): V3RegexMatcher =>
  validatedRegex(ISO8601_DATE_FORMAT, '2013-02-01', value);

/** Match an ISO 8601 time using the V2-compatible expression. */
export const iso8601Time = (value?: string): V3RegexMatcher =>
  validatedRegex(ISO8601_TIME_FORMAT, 'T22:44:30.652Z', value);

/** Match an RFC 1123 timestamp using the V2-compatible expression. */
export const rfc1123Timestamp = (value?: string): V3RegexMatcher =>
  validatedRegex(
    RFC1123_TIMESTAMP_FORMAT,
    'Mon, 31 Oct 2016 15:21:41 -0400',
    value,
  );

/** Match a hexadecimal string using the V2-compatible expression. */
export const hexadecimal = (value?: string): V3RegexMatcher =>
  validatedRegex(HEX_FORMAT, '3F', value);

/**
 * Matches the content type of a multipart field.
 * Used for matching binary content or specific content types in multipart requests.
 * @param contentTypeValue The content type to match (e.g., 'image/jpeg', 'text/plain')
 */
export const contentType = (contentTypeValue: string): Matcher<string> => ({
  'pact:matcher:type': 'contentType',
  value: contentTypeValue,
});

/**
 * Value that must be equal to the example. This is mainly used to reset the matching rules which cascade.
 * @param value Example value
 */
export const equal = <T>(value: T): Matcher<T> => ({
  'pact:matcher:type': 'equality',
  value,
});

/**
 * String value that must match the provided datetime format string.
 * @param format Datetime format string. See [Java SimpleDateFormat](https://docs.oracle.com/javase/8/docs/api/java/text/SimpleDateFormat.html)
 * @param example Example value to use. If omitted a value using the current system date and time will be generated.
 */
export function datetime(format: string, example: string): DateTimeMatcher {
  if (!example) {
    throw new Error(`you must provide an example datetime`);
  }

  return pickBy((v) => !isNil(v), {
    'pact:generator:type': example ? undefined : 'DateTime',
    'pact:matcher:type': 'timestamp',
    format,
    value: example,
  });
}

/**
 * String value that must match the provided datetime format string.
 * @param format Datetime format string. See [Java SimpleDateFormat](https://docs.oracle.com/javase/8/docs/api/java/text/SimpleDateFormat.html)
 * @param example Example value to use. If omitted a value using the current system date and time will be generated.
 */
export function timestamp(format: string, example: string): DateTimeMatcher {
  if (!example) {
    throw new Error(`you must provide an example timestamp`);
  }
  return datetime(format, example);
}

/**
 * String value that must match the provided time format string.
 * @param format Time format string. See [Java SimpleDateFormat](https://docs.oracle.com/javase/8/docs/api/java/text/SimpleDateFormat.html)
 * @param example Example value to use. If omitted a value using the current system time will be generated.
 */
export function time(format: string, example: string): DateTimeMatcher {
  if (!example) {
    throw new Error(`you must provide an example time`);
  }
  return pickBy((v) => !isNil(v), {
    'pact:generator:type': example ? undefined : 'Time',
    'pact:matcher:type': 'time',
    format,
    value: example,
  });
}

/**
 * String value that must match the provided date format string.
 * @param format Date format string. See [Java SimpleDateFormat](https://docs.oracle.com/javase/8/docs/api/java/text/SimpleDateFormat.html)
 * @param example Example value to use. If omitted a value using the current system date will be generated.
 */
export function date(format: string, example: string): DateTimeMatcher {
  if (!example) {
    throw new Error(`you must provide an example date`);
  }
  return pickBy((v) => !isNil(v), {
    format,
    'pact:generator:type': example ? undefined : 'Date',
    'pact:matcher:type': 'date',
    value: example,
  });
}

/**
 * Value that must include the example value as a substring.
 * @param value String value to include
 */
export function includes(value: string): Matcher<string> {
  return {
    'pact:matcher:type': 'include',
    value,
  };
}

/**
 * Value that must be null. This will only match the JSON Null value. For other content types, it will
 * match if the attribute is missing.
 */
export function nullValue(): Matcher<null> {
  return {
    'pact:matcher:type': 'null',
    value: null,
  };
}

type AnyMatcher<T> = Matcher<T> | CombinedMatcher<T>;

/** The example type of a matcher, e.g. `string` for `Matcher<string>` */
type MatcherExample<M> =
  M extends CombinedMatcher<infer T>
    ? T
    : M extends Matcher<infer T>
      ? T
      : never;

const isCombinedMatcher = (x: unknown): x is CombinedMatcher<unknown> =>
  x != null &&
  Array.isArray((x as CombinedMatcher<unknown>)['pact:matcher:type']);

/**
 * Converts a matcher into the list of single matchers used in an OR group. The example
 * (`value`) and any generator are dropped, as only the example of the first matcher is used.
 */
const toAlternatives = (
  matcher: AnyMatcher<unknown>,
  index: number,
): MatcherAlternative[] => {
  if (
    matcher == null ||
    typeof matcher !== 'object' ||
    matcher['pact:matcher:type'] === undefined
  ) {
    throw new Error(
      `anyOf: argument ${index + 1} is not a matcher. Wrap example values in a matcher, e.g. equal(value)`,
    );
  }
  if (isCombinedMatcher(matcher)) {
    if (matcher['pact:matcher:combine'].toUpperCase() !== 'OR') {
      throw new Error(
        `anyOf: argument ${index + 1} combines its matchers with ${matcher['pact:matcher:combine']}, which can not be nested in an OR`,
      );
    }
    return matcher['pact:matcher:type'];
  }
  const {
    value: _value,
    'pact:generator:type': _generator,
    ...alternative
  } = matcher as Matcher<unknown> & Record<string, unknown>;
  return [alternative];
};

/**
 * Value must match at least one of the given matchers (the matchers are combined with OR).
 *
 * The example used in the consumer test is taken from the first matcher, so order the
 * matchers so that the one with the example you want comes first. Only that example is
 * exercised by the consumer test; the other alternatives are only checked when verifying
 * the provider.
 *
 * Matchers nested inside the first matcher's example (e.g. `like({ id: integer(1) })`)
 * still apply to the children of the value.
 *
 * Requires a version of the Pact FFI that supports `pact:matcher:combine`
 * (pact-foundation/pact-reference#601).
 *
 * @example
 * anyOf(string('Fred'), nullValue())
 * anyOf(uuid(), regex(/^\d+$/, '42'))
 *
 * @param matchers The matchers to combine. At least one is required.
 */
export function anyOf<M extends AnyMatcher<unknown>[]>(
  ...matchers: M
): CombinedMatcher<MatcherExample<M[number]>> {
  if (matchers.length === 0) {
    throw new Error('anyOf: at least one matcher is required');
  }
  const alternatives = matchers.flatMap(toAlternatives);
  const [first] = matchers;
  if (first.value === undefined) {
    throw new Error(
      `anyOf: the first matcher ('${JSON.stringify(first['pact:matcher:type'])}') has no example value`,
    );
  }

  // Keep the generator of the first matcher (and its attributes, e.g. the provider
  // state expression), as the example comes from it
  const generator =
    first['pact:generator:type'] !== undefined
      ? (({ 'pact:matcher:type': _type, value: _value, ...rest }) => rest)(
          first as Matcher<unknown> & Record<string, unknown>,
        )
      : {};

  return {
    ...generator,
    'pact:matcher:type': alternatives,
    'pact:matcher:combine': 'OR',
    value: first.value as MatcherExample<M[number]>,
  };
}

/**
 * Value must be either null, or match the given template by type. Use this for
 * optional objects, e.g. `likeOrNull({ street: string('Main St'), number: integer(42) })`
 * @param template Template to base the comparison on
 */
export const likeOrNull = <T>(template: T): CombinedMatcher<T | null> =>
  anyOf(like(template), nullValue());

/**
 * Value must be either null, or a string
 * @param str Example value
 */
export const stringOrNull = (str?: string): CombinedMatcher<string | null> =>
  anyOf(string(str), nullValue());

/**
 * Value must be either null, or an integer
 * @param int Example value. If omitted a random value will be generated.
 */
export const integerOrNull = (int?: number): CombinedMatcher<number | null> =>
  anyOf(integer(int), nullValue());

/**
 * Value must be either null, or a decimal number
 * @param num Example value. If omitted a random value will be generated.
 */
export const decimalOrNull = (num?: number): CombinedMatcher<number | null> =>
  anyOf(decimal(num), nullValue());

/**
 * Value must be either null, or a number
 * @param num Example value. If omitted a random integer value will be generated.
 */
export const numberOrNull = (num?: number): CombinedMatcher<number | null> =>
  anyOf(number(num), nullValue());

/**
 * Value must be either null, or a boolean
 * @param b Example value. Defaults to true if unsupplied
 */
export const booleanOrNull = (b?: boolean): CombinedMatcher<boolean | null> =>
  anyOf(boolean(b), nullValue());

/**
 * Value must be either null, or match the given regular expression
 * @param pattern Regular Expression to match
 * @param str Example value
 */
export const regexOrNull = (
  pattern: RegExp | string,
  str: string,
): CombinedMatcher<string | null> => anyOf(regex(pattern, str), nullValue());

/**
 * Value must be either null, or a UUID
 * @param example Example value. If omitted a random value will be generated.
 */
export const uuidOrNull = (example?: string): CombinedMatcher<string | null> =>
  anyOf(uuid(example), nullValue());

function stringFromRegex(r: RegExp): string {
  return new RandExp(r).gen();
}

/**
 * Matches a URL composed of a base path and a list of path fragments
 * @param basePath Base path of the URL. If null, will use the base URL from the mock server.
 * @param pathFragments list of path fragments, can be regular expressions
 */
export function url2(
  basePath: string | null,
  pathFragments: Array<string | V3RegexMatcher | RegExp>,
): V3RegexMatcher {
  const regexpr = [
    '.*(',
    ...pathFragments.map((p) => {
      if (p instanceof RegExp) {
        return `\\/${p.source}`;
      }
      if (p instanceof Object && p['pact:matcher:type'] === 'regex') {
        return `\\/${p.regex}`;
      }
      return `\\/${p.toString()}`;
    }),
  ].join('');

  const example = [
    basePath || 'http://localhost:8080',
    ...pathFragments.map((p) => {
      if (p instanceof RegExp) {
        return `/${stringFromRegex(p)}`;
      }
      if (p instanceof Object && p['pact:matcher:type'] === 'regex') {
        return `/${p.value}`;
      }
      return `/${p.toString()}`;
    }),
  ].join('');

  // Temporary fix for inconsistencies between matchers and generators. Matchers use "value" attribute for
  // example values, while generators use "example"
  if (basePath == null) {
    return {
      'pact:matcher:type': 'regex',
      'pact:generator:type': 'MockServerURL',
      regex: `${regexpr})$`,
      value: example,
      example,
    };
  }
  return {
    'pact:matcher:type': 'regex',
    regex: `${regexpr})$`,
    value: example,
  };
}

/**
 * Matches a URL composed of a list of path fragments. The base URL from the mock server will be used.
 * @param pathFragments list of path fragments, can be regular expressions
 */
export function url(
  pathFragments: Array<string | V3RegexMatcher | RegExp>,
): V3RegexMatcher {
  return url2(null, pathFragments);
}

/**
 * Matches the items in an array against a number of variants. Matching is successful if each variant
 * occurs once in the array. Variants may be objects containing matching rules.
 */
export function arrayContaining(...variants: unknown[]): ArrayContainsMatcher {
  return {
    'pact:matcher:type': 'arrayContains',
    variants,
  };
}

/**
 * Marks an item to be injected from the provider state
 * @param expression Expression to lookup in the provider state context
 * @param exampleValue Example value to use in the consumer test
 */
export function fromProviderState<V>(
  expression: string,
  exampleValue: V,
): ProviderStateInjectedValue<V> {
  return {
    'pact:matcher:type': 'type',
    'pact:generator:type': 'ProviderState',
    expression,
    value: exampleValue,
  };
}

/**
 * Match a universally unique identifier (UUID). Random values will be used for examples if no example is given.
 */
export function uuid(example?: string): V3RegexMatcher {
  const regexStr =
    '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  if (example) {
    const regexpr = new RegExp(`^${regexStr}$`);
    if (!example.match(regexpr)) {
      throw new Error(
        `regex: Example value '${example}' does not match the UUID regular expression '${regexStr}'`,
      );
    }
    return {
      'pact:matcher:type': 'regex',
      regex: regexStr,
      value: example,
    };
  }
  return {
    'pact:matcher:type': 'regex',
    regex: regexStr,
    'pact:generator:type': 'Uuid',
    value: 'e2490de5-5bd3-43d5-b7c4-526e33f71304',
  };
}

export const matcherValueOrString = (obj: unknown): string => {
  if (typeof obj === 'string') return obj;

  return JSON.stringify(obj);
};

/**
 * Type guard to check if a value is a StatusCodeMatcher.
 */
export const isStatusCodeMatcher = (
  status: number | StatusCodeMatcher<number>,
): status is StatusCodeMatcher<number> =>
  isMatcher(status) && status['pact:matcher:type'] === 'statusCode';

/**
 * Recurse the object removing any underlying matching guff, returning the raw
 * example content.
 */
export function reify<T extends AnyJson = AnyJson>(input: unknown): T {
  if (isMatcher(input)) {
    return reify<T>(input.value);
  }

  if (Array.isArray(input)) {
    return input.map(reify) as unknown as T;
  }

  if (typeof input === 'object') {
    if (input === null) {
      return input as unknown as T;
    }
    const objectInput = input as JsonMap;
    return Object.keys(objectInput).reduce<JsonMap>((acc, propName) => {
      acc[propName] = reify(objectInput[propName]);
      return acc;
    }, {}) as unknown as T;
  }

  if (
    typeof input === 'number' ||
    typeof input === 'string' ||
    typeof input === 'boolean'
  ) {
    return input as unknown as T;
  }
  throw new Error(
    `Unable to strip matcher from a '${typeof input}', as it is not valid in a Pact description`,
  );
}

export { reify as extractPayload };
