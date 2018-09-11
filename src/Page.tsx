import * as React from "react";
import * as ReactDOM from "react-dom";
import CoinApp from "./CoinApp";

interface State {}

class Page extends React.Component<{}, State> {
    readonly state: State = {};

    render() {
        return [
            <header key="head">
                <h1>C0 Interpreter</h1>
            </header>,
            <main key="main">
                <CoinApp />
            </main>,
            <footer key="footer">
                By <a href="https://calculem.us/about/">Rob Simmons</a>
            </footer>
        ];
    }
}

ReactDOM.render(<Page />, document.getElementById("page"));
