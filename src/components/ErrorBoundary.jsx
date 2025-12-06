import React from 'react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught Error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '20px',
                    color: '#ff6b6b',
                    background: 'rgba(0,0,0,0.9)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999,
                    position: 'relative'
                }}>
                    <h2>⚠️ Something went wrong</h2>
                    <p>{this.state.error && this.state.error.toString()}</p>
                    <button
                        onClick={() => {
                            this.setState({ hasError: false });
                            if (this.props.onReset) this.props.onReset();
                        }}
                        style={{
                            marginTop: '15px',
                            padding: '10px 20px',
                            background: '#fff',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold'
                        }}
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
