import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        environmentOptions: {
            jsdom: {
                url: 'https://petak.test',
            },
        },
        include: ['tests/js/**/*.test.js'],
    },
});
