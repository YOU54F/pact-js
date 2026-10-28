import type { ConsumerInteraction } from '@pact-foundation/pact-core';
import { vi } from 'vitest';
import { regex } from '../../v3/matchers';
import { XmlBuilder } from '../../v4';
import { ResponseBuilder } from './responseBuilder';

describe('V4 ResponseBuilder', () => {
  let withResponseBody: ReturnType<typeof vi.fn>;
  let withResponseHeader: ReturnType<typeof vi.fn>;
  let interaction: ConsumerInteraction;
  let builder: ResponseBuilder;

  beforeEach(() => {
    withResponseBody = vi.fn();
    withResponseHeader = vi.fn();
    interaction = {
      withResponseBody,
      withResponseHeader,
    } as unknown as ConsumerInteraction;
    builder = new ResponseBuilder(interaction);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('#headers', () => {
    it('registers a single header value at index 0', () => {
      builder.headers({ 'Content-Type': 'application/json' });

      expect(withResponseHeader).toHaveBeenCalledOnce();
      expect(withResponseHeader).toHaveBeenCalledWith(
        'Content-Type',
        0,
        'application/json',
      );
    });

    it('registers each value of a repeated header at its own index', () => {
      builder.headers({ 'Set-Cookie': ['a=1', 'b=2'] });

      expect(withResponseHeader).toHaveBeenCalledTimes(2);
      expect(withResponseHeader).toHaveBeenNthCalledWith(
        1,
        'Set-Cookie',
        0,
        'a=1',
      );
      expect(withResponseHeader).toHaveBeenNthCalledWith(
        2,
        'Set-Cookie',
        1,
        'b=2',
      );
    });

    it('serialises matchers within a repeated header', () => {
      const matcher = regex('^b=\\d+$', 'b=2');

      builder.headers({ 'Set-Cookie': ['a=1', matcher] });

      expect(withResponseHeader).toHaveBeenNthCalledWith(
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
    it('calls withResponseBody with application/xml content type', () => {
      const body = new XmlBuilder('1.0', 'UTF-8', 'root').build((el) => {
        el.appendElement('item', new Map(), 'value');
      });

      builder.xmlBody(body);

      expect(withResponseBody).toHaveBeenCalledOnce();
      expect(withResponseBody).toHaveBeenCalledWith(body, 'application/xml');
    });

    it('supports XmlBuilder with matchers', () => {
      const body = new XmlBuilder('1.0', 'UTF-8', 'items').build((el) => {
        el.eachLike('item', new Map(), (item) => item.appendText('value'));
      });

      builder.xmlBody(body);

      expect(withResponseBody).toHaveBeenCalledOnce();
      expect(withResponseBody).toHaveBeenCalledWith(body, 'application/xml');
    });

    it('returns the builder for chaining', () => {
      const body = new XmlBuilder('1.0', 'UTF-8', 'root').build(() => {});

      const result = builder.xmlBody(body);

      expect(result).toBe(builder);
    });
  });
});
