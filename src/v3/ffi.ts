import type { ConsumerInteraction } from '@pact-foundation/pact-core';
import { forEachObjIndexed } from 'ramda';
import logger from '../common/logger';
import { convertStatusMatcherToFFI } from '../common/matchingRules';
import * as MatchersV3 from './matchers';
import type { Matcher, TemplateHeaders, V3Request, V3Response } from './types';

type TemplateHeaderArrayValue = string[] | Matcher<string>[];

export const setRequestDetails = (
  interaction: ConsumerInteraction,
  req: V3Request,
): void => {
  interaction.withRequest(
    req.method,
    MatchersV3.matcherValueOrString(req.path),
  );
  forEachObjIndexed((v, k) => {
    if (Array.isArray(v)) {
      (v as TemplateHeaderArrayValue).forEach((header, index) => {
        interaction.withRequestHeader(
          k,
          index,
          MatchersV3.matcherValueOrString(header),
        );
      });
    } else {
      interaction.withRequestHeader(k, 0, MatchersV3.matcherValueOrString(v));
    }
  }, req.headers);

  forEachObjIndexed((v, k) => {
    if (Array.isArray(v)) {
      (v as unknown[]).forEach((vv, i) => {
        interaction.withQuery(k, i, MatchersV3.matcherValueOrString(vv));
      });
    } else {
      interaction.withQuery(k, 0, MatchersV3.matcherValueOrString(v));
    }
  }, req.query);
};

export const setResponseDetails = (
  interaction: ConsumerInteraction,
  res: V3Response,
): void => {
  interaction.withStatus(MatchersV3.reify<number>(res.status));

  if (MatchersV3.isStatusCodeMatcher(res.status)) {
    interaction.withResponseMatchingRules(
      JSON.stringify(convertStatusMatcherToFFI(res.status)),
    );
  }

  forEachObjIndexed((v, k) => {
    if (Array.isArray(v)) {
      (v as TemplateHeaderArrayValue).forEach((header, index) => {
        interaction.withResponseHeader(
          k,
          index,
          MatchersV3.matcherValueOrString(header),
        );
      });
    } else {
      interaction.withResponseHeader(k, 0, MatchersV3.matcherValueOrString(v));
    }
  }, res.headers);
};

export const contentTypeFromHeaders = (
  headers: TemplateHeaders | undefined,
  defaultContentType: string,
): string => {
  let contentType: string | Matcher<string> = defaultContentType;
  forEachObjIndexed((v, k) => {
    if (`${k}`.toLowerCase() === 'content-type') {
      const headerValue = Array.isArray(v) ? v[0] : v;
      contentType = MatchersV3.isMatcher(headerValue)
        ? MatchersV3.matcherValueOrString(headerValue.value)
        : MatchersV3.matcherValueOrString(headerValue);
    }
  }, headers || {});

  return contentType;
};

const isJsonContentType = (contentType: string): boolean =>
  /json/i.test(contentType);

/**
 * pact_ffi only reads matchers embedded in a JSON body. When the whole body is a single matcher and the content
 * type is not JSON (for example `text/plain`), send the example as the body and the matcher as a rule on `$`, so
 * the body is not written as the matcher's JSON (pact-js#1107).
 */
export const bodyAndMatchingRules = (
  body: unknown,
  contentType: string,
): { body: string; rules?: string } => {
  if (
    !MatchersV3.isMatcher(body) ||
    isJsonContentType(contentType) ||
    typeof body.value === 'object'
  ) {
    return { body: MatchersV3.matcherValueOrString(body) };
  }

  const {
    'pact:matcher:type': match,
    'pact:generator:type': generator,
    value,
    ...attributes
  } = body as Matcher<unknown> & Record<string, unknown>;
  if (generator) {
    logger.warn(
      `the ${generator} generator is not supported for a ${contentType} body, only the matcher will be used`,
    );
  }
  const rules = {
    body: { $: { combine: 'AND', matchers: [{ ...attributes, match }] } },
  };
  return { body: `${value}`, rules: JSON.stringify(rules) };
};
