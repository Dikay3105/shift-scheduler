import { useEditor, EditorContent } from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";

import Underline from "@tiptap/extension-underline";

import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    Undo2,
    Redo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
    content: string;

    onChange: (html: string) => void;
};

export default function WordEditor({
    content,
    onChange,
}: Props) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
        ],

        content,
        immediatelyRender: false,

        editorProps: {
            attributes: {
                class:
                    "min-h-[500px] rounded-2xl border bg-white p-6 focus:outline-none prose max-w-none",
            },
        },

        onUpdate({ editor }) {
            onChange(editor.getHTML());
        },
    });

    if (!editor) return null;

    return (
        <div className="overflow-hidden rounded-3xl border bg-background">
            <div className="flex flex-wrap gap-2 border-b p-4">
                <Button
                    size="icon"
                    variant={
                        editor.isActive("bold")
                            ? "default"
                            : "outline"
                    }
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .toggleBold()
                            .run()
                    }
                >
                    <Bold className="h-4 w-4" />
                </Button>

                <Button
                    size="icon"
                    variant={
                        editor.isActive("italic")
                            ? "default"
                            : "outline"
                    }
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .toggleItalic()
                            .run()
                    }
                >
                    <Italic className="h-4 w-4" />
                </Button>

                <Button
                    size="icon"
                    variant={
                        editor.isActive("underline")
                            ? "default"
                            : "outline"
                    }
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .toggleUnderline()
                            .run()
                    }
                >
                    <UnderlineIcon className="h-4 w-4" />
                </Button>

                <Button
                    size="icon"
                    variant="outline"
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .toggleBulletList()
                            .run()
                    }
                >
                    <List className="h-4 w-4" />
                </Button>

                <Button
                    size="icon"
                    variant="outline"
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .toggleOrderedList()
                            .run()
                    }
                >
                    <ListOrdered className="h-4 w-4" />
                </Button>

                <Button
                    size="icon"
                    variant="outline"
                    onClick={() =>
                        editor.chain().undo().run()
                    }
                >
                    <Undo2 className="h-4 w-4" />
                </Button>

                <Button
                    size="icon"
                    variant="outline"
                    onClick={() =>
                        editor.chain().redo().run()
                    }
                >
                    <Redo2 className="h-4 w-4" />
                </Button>
            </div>

            <EditorContent editor={editor} />
        </div>
    );
}