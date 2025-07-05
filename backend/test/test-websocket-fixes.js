const { execSync } = require('child_process');

console.log('🧪 Running WebSocket Fix Tests...\n');

const tests = [
  {
    name: 'LabStatusService Unit Tests',
    command: 'npm test -- --testPathPattern="lab-status.service.spec.ts"',
    description: 'Tests the central service logic for consistent data'
  },
  {
    name: 'EventsGateway Unit Tests', 
    command: 'npm test -- --testPathPattern="events.gateway.spec.ts"',
    description: 'Tests WebSocket event broadcasting logic'
  }
];

let passedTests = 0;
let totalTests = tests.length;

tests.forEach((test, index) => {
  console.log(`\n${index + 1}. ${test.name}`);
  console.log(`   ${test.description}`);
  console.log(`   Command: ${test.command}`);
  
  try {
    execSync(test.command, { stdio: 'inherit', cwd: __dirname });
    console.log(`   ✅ PASSED`);
    passedTests++;
  } catch (error) {
    console.log(`   ❌ FAILED`);
    console.log(`   Error: ${error.message}`);
  }
});

console.log(`\n📊 Test Summary:`);
console.log(`   Passed: ${passedTests}/${totalTests}`);
console.log(`   Success Rate: ${Math.round((passedTests/totalTests) * 100)}%`);

if (passedTests === totalTests) {
  console.log(`\n🎉 All tests passed! WebSocket fixes are working correctly.`);
  console.log(`\n✅ Problem 1 Fixed: maxOccupancy shows correct values (not 0)`);
  console.log(`✅ Problem 2 Fixed: REST API and WebSocket data consistency`);
} else {
  console.log(`\n⚠️  Some tests failed. Please check the output above.`);
}

console.log(`\n🔧 Next Steps:`);
console.log(`   1. Run manual tests with MQTT simulator`);
console.log(`   2. Test with Flutter frontend`);
console.log(`   3. Verify real-time updates work correctly`);
