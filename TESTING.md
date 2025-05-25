# Testing Setup for BufferTab

This project uses Vitest for testing, providing a fast and modern testing experience that integrates seamlessly with Vite.

## Testing Stack

- **Vitest**: Fast unit test framework built on top of Vite
- **@testing-library/react**: Simple and complete testing utilities for React components
- **@testing-library/jest-dom**: Custom jest matchers for testing DOM elements
- **@testing-library/user-event**: Fire events the same way the user does
- **jsdom**: DOM implementation for testing browser-like environment

## Available Scripts

```bash
# Run tests in watch mode (default)
npm test

# Run tests once and exit
npm run test:run

# Run tests with UI (if @vitest/ui is installed)
npm run test:ui
```

## Test Structure

```
src/test/
├── setup.ts           # Test setup and global mocks
├── EditorApp.test.tsx # Main component tests
└── utils.test.ts      # Utility function tests
```

## Writing Tests

### Component Tests

Component tests should verify:

- Component renders without crashing
- Essential UI elements are present
- User interactions work correctly
- Component state behaves as expected

Example:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MyComponent from "../MyComponent";

describe("MyComponent", () => {
	it("renders correctly", () => {
		render(<MyComponent />);
		expect(screen.getByText("Hello")).toBeInTheDocument();
	});
});
```

### Utility Tests

Test pure functions and utilities:

```typescript
describe("Utility Functions", () => {
	it("should format text correctly", () => {
		expect(formatText("hello")).toBe("Hello");
	});
});
```

## Mocked APIs

The test setup includes mocks for:

- `window.matchMedia` - For responsive design tests
- `ResizeObserver` - For components that observe element resizing
- `window.visualViewport` - For mobile viewport handling

## Best Practices

1. **Test behavior, not implementation** - Focus on what the user sees and does
2. **Use descriptive test names** - Clearly describe what each test verifies
3. **Keep tests isolated** - Each test should be independent
4. **Use proper assertions** - Choose the right matcher for each assertion
5. **Mock external dependencies** - Keep tests fast and reliable

## Coverage

To see test coverage, you can add coverage configuration to your `vite.config.ts`:

```typescript
test: {
	coverage: {
		reporter: ["text", "json", "html"];
	}
}
```

Then run: `npm test -- --coverage`
