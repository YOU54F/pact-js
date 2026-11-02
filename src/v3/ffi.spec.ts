import { bodyAndMatchingRules, contentTypeFromHeaders } from './ffi';
import { like, regex, string } from './matchers';

describe('V3 Pact FFI', () => {
  describe('#contentTypeFromHeaders', () => {
    it('uses matcher example value when content-type header is a matcher', () => {
      const headers = {
        'Content-Type': regex(
          /^application\/json(;\s?charset=[\w-]+)?$/i,
          'application/json',
        ),
      };

      expect(contentTypeFromHeaders(headers, 'application/json')).toBe(
        'application/json',
      );
    });
  });

  describe('#bodyAndMatchingRules', () => {
    it('sends a matcher on a text body as its example and a rule on the body', () => {
      expect(bodyAndMatchingRules(string('07/14/2023'), 'text/plain')).toEqual({
        body: '07/14/2023',
        rules: JSON.stringify({
          body: {
            $: { combine: 'AND', matchers: [{ match: 'type' }] },
          },
        }),
      });
    });

    it('keeps the regex of a regex matcher', () => {
      const { body, rules } = bodyAndMatchingRules(
        regex('\\d+', '123'),
        'text/plain; charset=utf-8',
      );
      expect(body).toBe('123');
      expect(JSON.parse(rules as string).body.$.matchers).toEqual([
        { regex: '\\d+', match: 'regex' },
      ]);
    });

    it('sends a matcher on a JSON body as matcher JSON', () => {
      const matcher = like({ a: 1 });
      expect(bodyAndMatchingRules(matcher, 'application/hal+json')).toEqual({
        body: JSON.stringify(matcher),
      });
    });

    it('sends a plain text body as it is', () => {
      expect(bodyAndMatchingRules('hello', 'text/plain')).toEqual({
        body: 'hello',
      });
    });
  });
});
