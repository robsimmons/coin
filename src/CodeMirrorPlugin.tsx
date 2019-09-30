import * as React from "react";
import * as CodeMirror from "codemirror";
import { parseProgram } from "@calculemus/jaco/lib/parse";
import { GlobalEnv } from "@calculemus/jaco/lib/typecheck/globalenv";
import { checkProgramFragment } from "@calculemus/jaco/lib/typecheck/programs";
import { Position } from "@calculemus/jaco/lib/ast";
import * as ast from "@calculemus/jaco/lib/ast";

/**
 * Translate AST positions to CodeMirror positions.
 */
function pos(p: Position): CodeMirror.Position {
    return {
        line: p.line - 1,
        ch: p.column - 1
    };
}

export interface Props {
    refresh(status: string): void;
    refresh(genv: GlobalEnv, program: ast.Declaration[]): void;
}

/**
 * The CodeMirrorPlugin isn't actually a ReactComponent; it never updates.
 */
export class CodeMirrorPlugin extends React.Component<Props> {
    private el: HTMLElement | null = null;

    shouldComponentUpdate() {
        return false;
    }

    private updateMe(doc: CodeMirror.Doc, text: string) {
        try {
            const program = parseProgram("C1", text);
            const genv = checkProgramFragment([], program);
            this.props.refresh(genv, program);
        } catch (err) {
            if (err instanceof Error && err.name === "ParsingError") {
                const loc = (err as any).loc;
                doc.markText(pos(loc.start), pos(loc.end), {
                    className: "syntaxerror",
                    title: err.message
                });
            } else if (err instanceof Error && err.name === "TypingError") {
                const loc = (err as any).loc;
                doc.markText(pos(loc.start), pos(loc.end), {
                    className: "typeerror",
                    title: err.message
                });
                this.props.refresh(err.message);
            } else if (err instanceof Error && err.name === "IncompleteParseError") {
                this.props.refresh("Incomplete parse at the end of the file");
            } else if ("token" in err) {
                doc.markText(
                    pos({ line: err.token.line, column: err.token.col }),
                    pos({ line: err.token.line, column: err.token.col + err.token.text.length }),
                    { className: "badsyntax", title: "Syntax error here (or just before here)" }
                );
                this.props.refresh(`Syntax error: unexpected token ${err.token}`);
            } else {
                console.log("Unknown error");
                console.log(err);
                this.props.refresh(`${err}`);
            }
        }
    }

    componentDidMount() {
        if (this.el === null) {
            console.error("Could not render element");
        } else {
            const editor = CodeMirror(this.el, {
                value: "int FIB(int n) {\n  return n <= 1 ? n : FIB(n-1) + FIB(n-2);\n}",
                lineNumbers: true
            });
            const doc = editor.getDoc();
            let text = editor.getValue();
            editor.on("update", () => {
                if (text !== editor.getValue()) {
                    text = editor.getValue();
                    doc.getAllMarks().forEach(x => x.clear());
                    this.updateMe(doc, text);
                }
            });
            this.updateMe(doc, text);
            //const doc = this.editor.getDoc();
            //const output =
        }
    }

    render() {
        return <div ref={el => (this.el = el)} />;
    }
}
