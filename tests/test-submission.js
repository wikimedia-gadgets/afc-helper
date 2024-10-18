/**
 * Tests for src/modules/submission.js
 */

/* eslint-env jest */
/* eslint-disable indent, quotes */

require('./scaffold.js');

resetToAFCApplicablePage();

requireScript('modules/submission.js');

// Test suite for AFCH.Text.prototype.cleanUp function
describe('AFCH.Text.prototype.cleanUp', () => {
    function cleanUp(text, isAccept) {
        const AFCH = require('modules/submission.js');
        return AFCH.Text.prototype.cleanUp.call({ text: text }, isAccept);
    }

    it('should handle empty input', () => {
        const input = '';
        const output = cleanUp(input, true); // Defaulting to true for empty input
        expect(output).toBe('');
    });

    it('should clean up {{Draft categories|[[Category:Test]]}} when isAccept is true', () => {
        const input = '{{Draft categories|[[Category:Test]]}}';
        const expectedOutput = '[[Category:Test]]';
        const output = cleanUp(input, true);
        expect(output).toBe(expectedOutput);
    });

    it('should not clean up {{Draft categories|[[Category:Test]]}} when isAccept is false', () => {
        const input = '{{Draft categories|[[Category:Test]]}}';
        const expectedOutput = '';
        const output = cleanUp(input, false);
        expect(output).toBe(expectedOutput);
    });

    it('should clean up {{draft categories|[[Category:Test]]}} (case insensitive) when isAccept is true', () => {
        const input = '{{draft categories|[[Category:Test]]}}';
        const expectedOutput = '[[Category:Test]]';
        const output = cleanUp(input, true);
        expect(output).toBe(expectedOutput);
    });

    it('should not clean up {{draft categories|[[Category:Test]]}} (case insensitive) when isAccept is false', () => {
        const input = '{{draft categories|[[Category:Test]]}}';
        const expectedOutput = '';
        const output = cleanUp(input, false);
        expect(output).toBe(expectedOutput);
    });

    it('should clean up {{Draftcat|[[Category:Test]]}} when isAccept is true', () => {
        const input = '{{Draftcat|[[Category:Test]]}}';
        const expectedOutput = '[[Category:Test]]';
        const output = cleanUp(input, true);
        expect(output).toBe(expectedOutput);
    });

    it('should not clean up {{Draftcat|[[Category:Test]]}} when isAccept is false', () => {
        const input = '{{Draftcat|[[Category:Test]]}}';
        const expectedOutput = '';
        const output = cleanUp(input, false);
        expect(output).toBe(expectedOutput);
    });

    it('should clean up multiple categories in {{Draft categories}} when isAccept is true', () => {
        const input = '{{Draft categories|[[Category:Test1]] [[Category:Test2]]}}';
        const expectedOutput = '[[Category:Test1]] [[Category:Test2]]';
        const output = cleanUp(input, true);
        expect(output).toBe(expectedOutput);
    });

    it('should not clean up {{Draft categories}} without categories when isAccept is false', () => {
        const input = '{{Draft categories}}';
        const expectedOutput = '';
        const output = cleanUp(input, false);
        expect(output).toBe(expectedOutput);
    });

    it('should clean up {{Draft categories}} with text outside the template when isAccept is true', () => {
        const input = 'Some text {{Draft categories|[[Category:Test]]}} more text';
        const expectedOutput = 'Some text [[Category:Test]] more text';
        const output = cleanUp(input, true);
        expect(output).toBe(expectedOutput);
    });

    it('should not alter non-draft templates', () => {
        const input = '{{NonDraft|[[Category:Test]]}}';
        const expectedOutput = '{{NonDraft|[[Category:Test]]}}';
        const output = cleanUp(input, true);
        expect(output).toBe(expectedOutput);
    });
});
