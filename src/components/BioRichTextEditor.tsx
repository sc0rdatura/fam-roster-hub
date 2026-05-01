import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import { Button } from "@/components/ui/button";

interface BioRichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

const EMPTY_DOC = "<p></p>";

export function BioRichTextEditor({ value, onChange }: BioRichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Bold,
      Italic,
    ],
    content: value?.trim() ? value : EMPTY_DOC,
    editorProps: {
      attributes: {
        class:
          "min-h-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      },
    },
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  if (!editor) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={editor.isActive("bold") ? "default" : "outline"}
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Bold
        </Button>
        <Button
          type="button"
          variant={editor.isActive("italic") ? "default" : "outline"}
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Italic
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
