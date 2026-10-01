import { Type, type Static } from 'typebox';
import { Compile } from 'typebox/compile';

const NullableDateTime = Type.Union([Type.String({ format: 'date-time' }), Type.Null()]);
const NullableText = Type.Union([Type.String(), Type.Null()]);

export const ExtractedItemInputSchema = Type.Object({
  kind: Type.Union([
    Type.Literal('task'), Type.Literal('deadline'), Type.Literal('meeting'), Type.Literal('event'),
  ]),
  title: Type.String({ minLength: 1, maxLength: 160 }),
  dueAt: NullableDateTime,
  startAt: NullableDateTime,
  location: NullableText,
  notes: NullableText,
  originalTimeText: NullableText,
  sourceExcerpt: Type.String({ minLength: 1, maxLength: 500 }),
  confidence: Type.Number({ minimum: 0, maximum: 1 }),
}, { additionalProperties: false });

export const ExtractionResultSchema = Type.Object({
  items: Type.Array(ExtractedItemInputSchema, { maxItems: 20 }),
}, { additionalProperties: false });

export type ExtractionResult = Static<typeof ExtractionResultSchema>;
const validator = Compile(ExtractionResultSchema);

export function validateExtractionResult(value: unknown): ExtractionResult {
  if (!validator.Check(value)) throw new Error('AI 返回的数据结构不符合要求');
  return value as ExtractionResult;
}
