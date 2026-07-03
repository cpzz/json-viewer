export type JsonNodeType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';

export interface JsonTreeNode {
  id: string;
  key: string;
  value: unknown;
  type: JsonNodeType;
  children?: JsonTreeNode[];
  isOpen?: boolean;
}
