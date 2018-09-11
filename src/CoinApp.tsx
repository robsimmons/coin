import * as React from "react";
import { ConsoleSync } from "@calculemus/aconsole";
import { CodeMirrorPlugin } from "./CodeMirrorPlugin";
import { expression as compileExpression, statement as compileStatement, program as compileProgram } from "@calculemus/jaco/lib/bytecode/generate";
import * as ast from "@calculemus/jaco/lib/ast";
import { Env } from "@calculemus/jaco/lib/typecheck/types";
import { checkStatement } from "@calculemus/jaco/lib/typecheck/statements";
import { GlobalEnv, initEmpty } from "@calculemus/jaco/lib/typecheck/globalenv";
import { executeInstructions, valueToString } from "@calculemus/jaco/lib/bytecode/execute";
import {
    Program as BytecodeProgram,
    empty as emptyBytecodeProgram
} from "@calculemus/jaco/lib/bytecode/high-level";
import { parseStatement } from "@calculemus/jaco/lib/parse";

export type State =
    | { readonly tag: "init" }
    | { readonly tag: "error"; readonly value: string }
    | { readonly tag: "program"; readonly genv: GlobalEnv; readonly program: ast.Declaration[] };

const emptyState = {
    genv: initEmpty(),
    env: new Map(),
    bytecode: emptyBytecodeProgram,
    locals: new Map<string, any>()
}

class CoinConsole extends React.Component<{ readonly initial: State }, { genv: GlobalEnv, env: Env, bytecode: BytecodeProgram, locals: Map<string, any> }> {
    readonly state: { genv: GlobalEnv, env: Env, bytecode: BytecodeProgram, locals: Map<string, any> } = emptyState;

    componentWillReceiveProps(props: { initial: State }) {
        if (props.initial.tag === "init") {
            this.setState(emptyState);
        } else if (props.initial.tag === "error"){
            this.setState(emptyState);
        } else {
            const program = compileProgram([], props.initial.program, true);
            this.setState({
                genv: props.initial.genv,
                env: new Map(),
                bytecode: program
            })
        }
    }

    render() {
        return <ConsoleSync 
        initial={
            this.props.initial.tag === "error"
                ? [{ kind: "error", value: this.props.initial.value }]
                : []
        }
        handleInput={(input: string) => {
            try {
                let prefix = "";
                const stms: ast.Statement[] = parseStatement(input, { });
                let exp: ast.Expression | null = null;
                try {
                    stms.forEach(stm => checkStatement(this.state.genv, this.state.env, stm, null, false));

                    // If the last statement is an expression, we want to switch it to the "exp" local so its output is printed
                    const last = stms[stms.length-1];
                    if (last.tag === "ExpressionStatement") {
                        stms.pop();
                        exp = last.expression;
                    } else if (last.tag === "VariableDeclaration" && last.init !== null) {
                        prefix = `${last.id.name} is `
                        exp = last.id;
                    } else if (last.tag === "AssignmentStatement" && last.left.tag === "Identifier") {
                        prefix = `${last.left.name} is `;
                        exp = last.left;
                    }

                    const stmbytecode = compileStatement({ tag: "BlockStatement", body: stms }, true)
                    executeInstructions(this.state.bytecode, this.state.locals, stmbytecode, 5000000)
                        
                    if (exp === null) {
                        return [];
                    } else {
                        const expbytecode = compileExpression(exp);
                        const result = executeInstructions(this.state.bytecode, this.state.locals, expbytecode, 5000000);
                        const value = valueToString(result);
                        return value === null ? [] : [{tag: "return", msg: `${prefix}${valueToString(result)}`}]
                    }
                } catch (err) {
                    return [{ tag: "error", msg: `${err}`}];
                }
            } catch (err) {
                console.log((err as Error).stack);
                if (err instanceof Error && err.name === "IncompleteParseError") {
                    return null;
                } else {
                    return [{tag: "error", msg: `${err}`}];
                }
            }
        }}
    />
    }
    
}


export default class CoinApp extends React.Component<{}, State> {
    readonly state: State = { tag: "init" };

    render() {
        return [
            <article key="article">
                <CodeMirrorPlugin
                    refresh={(errOrGenv: string | GlobalEnv, program?: ast.Declaration[]) => {
                        if (typeof errOrGenv === "string") {
                            this.setState(({ tag: "error", value: errOrGenv }));
                        } else {
                            this.setState(({
                                tag: "program",
                                genv: errOrGenv,
                                program: program!
                            })); 
                        }
                    }}
                />
            </article>,
            <aside key="aside">
                <CoinConsole initial={this.state}/>
            </aside>
        ];
    }
}

