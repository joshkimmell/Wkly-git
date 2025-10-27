declare module '@tiptap/react' {
  import type { Node } from 'prosemirror-model';
  export type Editor = any;
  export function useEditor(options?: any): any;
  export const EditorContent: any;
  export default any;
}

declare module '@tiptap/starter-kit' {
  const StarterKit: any;
  export default StarterKit;
}

declare module '@tiptap/extension-placeholder' {
  const Placeholder: any;
  export default Placeholder;
}
