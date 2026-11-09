import type { ConsumerInteraction } from '@pact-foundation/pact-core';
import { vi } from 'vitest';
import { regex } from '../../v3/matchers';
import { XmlBuilder } from '../../v4';
import { RequestBuilder } from './requestBuilder';

describe('V4 RequestBuilder', () => {
  let withRequestBody: ReturnType<typeof vi.fn>;
  let withRequestHeader: ReturnType<typeof vi.fn>;
  let interaction: ConsumerInteraction;
  let builder: RequestBuilder;

  beforeEach(() => {
    withRequestBody = vi.fn();
    withRequestHeader = vi.fn();
    interaction = {
      withRequestBody,
      withRequestHeader,
    } as unknown as ConsumerInteraction;
    builder = new RequestBuilder(interaction);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('#headers', () => {
    it('registers a single header value at index 0', () => {
      builder.headers({ 'Content-Type': 'application/json' });

      expect(withRequestHeader).toHaveBeenCalledOnce();
      expect(withRequestHeader).toHaveBeenCalledWith(
        'Content-Type',
        0,
        'application/json',
      );
    });

    it('registers each value of a repeated header at its own index', () => {
      builder.headers({ 'Set-Cookie': ['a=1', 'b=2'] });

      expect(withRequestHeader).toHaveBeenCalledTimes(2);
      expect(withRequestHeader).toHaveBeenNthCalledWith(
        1,
        'Set-Cookie',
        0,
        'a=1',
      );
      expect(withRequestHeader).toHaveBeenNthCalledWith(
        2,
        'Set-Cookie',
        1,
        'b=2',
      );
    });

    it('serialises matchers within a repeated header', () => {
      const matcher = regex('^b=\\d+$', 'b=2');

      builder.headers({ 'Set-Cookie': ['a=1', matcher] });

      expect(withRequestHeader).toHaveBeenNthCalledWith(
        2,
        'Set-Cookie',
        1,
        JSON.stringify(matcher),
      );
    });

    it('returns the builder for chaining', () => {
      expect(builder.headers({ 'X-Test': 'value' })).toBe(builder);
    });
  });

  describe('#xmlBody', () => {
    it('calls withRequestBody with application/xml content type', () => {
      const body = new XmlBuilder('1.0', 'UTF-8', 'root').build((el) => {
        el.appendElement('item', new Map(), 'value');
      });

      builder.xmlBody(body);

      expect(withRequestBody).toHaveBeenCalledOnce();
      expect(withRequestBody).toHaveBeenCalledWith(body, 'application/xml');
    });

    it('supports XmlBuilder with matchers', () => {
      const body = new XmlBuilder('1.0', 'UTF-8', 'items').build((el) => {
        el.eachLike('item', new Map(), (item) => item.appendText('value'));
      });

      builder.xmlBody(body);

      expect(withRequestBody).toHaveBeenCalledOnce();
      expect(withRequestBody).toHaveBeenCalledWith(body, 'application/xml');
    });

    it('returns the builder for chaining', () => {
      const body = new XmlBuilder('1.0', 'UTF-8', 'root').build(() => {});

      const result = builder.xmlBody(body);

      expect(result).toBe(builder);
    });
  });
});
