# @ingress/example

This is an example project demonstrating how to use the ingress framework to build a simple web application with routes.

## Files

- `src/greet.ts` - Defines a Routes controller with a greeting endpoint
- `src/app.ts` - Main application file that starts the server using `fromGlobalContext()`

## Usage

1. Build the project:
   ```bash
   npm run build
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Test the greeting endpoint:
   ```bash
   curl http://localhost:<port>/greet/world
   ```

This will return: `Hello world`

## Features Demonstrated

- **Route decorators**: Using `@Routes('/greet')` to define a controller with a base path
- **HTTP method decorators**: Using `@Route.Get("/:name")` to define a GET endpoint
- **Parameter injection**: Using `@Route.Param("name")` to extract URL parameters
- **Global context usage**: Using `fromGlobalContext()` to automatically collect and register routes 
