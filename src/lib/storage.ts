import { ABTest } from '@/types';

const STORAGE_KEY = 'ab-tests';

export class TestStorage {
  static getAllTests(): ABTest[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading tests:', error);
      return [];
    }
  }

  static saveTest(test: ABTest): void {
    try {
      const tests = this.getAllTests();
      const existingIndex = tests.findIndex(t => t.id === test.id);
      
      if (existingIndex >= 0) {
        tests[existingIndex] = test;
      } else {
        tests.push(test);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
    } catch (error) {
      console.error('Error saving test:', error);
    }
  }

  static deleteTest(testId: string): void {
    try {
      const tests = this.getAllTests();
      const filtered = tests.filter(t => t.id !== testId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting test:', error);
    }
  }

  static getTest(testId: string): ABTest | null {
    try {
      const tests = this.getAllTests();
      return tests.find(t => t.id === testId) || null;
    } catch (error) {
      console.error('Error getting test:', error);
      return null;
    }
  }

  static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}