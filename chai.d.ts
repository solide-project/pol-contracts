import "chai";

declare global {
    namespace Chai {
        interface Assertion {
            reverted: Promise<void>;
        }
    }
}