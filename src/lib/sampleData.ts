export const generateSampleData = () => {
  const sampleData = [
    ['S.No', 'Customer Name', 'Customer ID', 'Variant Type', 'Opened Email', 'Clicked Link', 'Converted', 'Date'],
    ['1', 'Frank Williams', 'C0001', 'Control', 'Yes', 'No', 'No', '27-05-2025'],
    ['2', 'Helen Williams', 'C0002', 'Test', 'Yes', 'No', 'No', '07-07-2025'],
    ['3', 'Helen Wilson', 'C0003', 'Control', 'Yes', 'No', 'No', '27-06-2025'],
    ['4', 'Helen Smith', 'C0004', 'Control', 'Yes', 'Yes', 'Yes', '11-05-2025'],
    ['5', 'John Doe', 'C0005', 'Test', 'Yes', 'Yes', 'Yes', '15-05-2025'],
    ['6', 'Jane Smith', 'C0006', 'Control', 'Yes', 'No', 'No', '18-05-2025'],
    ['7', 'Bob Johnson', 'C0007', 'Test', 'Yes', 'Yes', 'No', '20-05-2025'],
    ['8', 'Alice Brown', 'C0008', 'Control', 'Yes', 'Yes', 'Yes', '22-05-2025'],
    ['9', 'Charlie Davis', 'C0009', 'Test', 'Yes', 'No', 'No', '25-05-2025'],
    ['10', 'Eva Wilson', 'C0010', 'Control', 'Yes', 'Yes', 'Yes', '28-05-2025'],
    ['11', 'Mike Jones', 'C0011', 'Test', 'Yes', 'Yes', 'Yes', '30-05-2025'],
    ['12', 'Sarah Taylor', 'C0012', 'Control', 'Yes', 'No', 'No', '02-06-2025'],
    ['13', 'David Miller', 'C0013', 'Test', 'Yes', 'Yes', 'No', '05-06-2025'],
    ['14', 'Lisa Anderson', 'C0014', 'Control', 'Yes', 'Yes', 'Yes', '08-06-2025'],
    ['15', 'Tom Wilson', 'C0015', 'Test', 'Yes', 'No', 'No', '10-06-2025'],
  ];

  // Generate more realistic data with different conversion rates for control vs test
  const additionalData = [];
  for (let i = 16; i <= 1000; i++) {
    const isTest = Math.random() > 0.5;
    const variant = isTest ? 'Test' : 'Control';
    
    // Control group: 10% conversion rate
    // Test group: 12% conversion rate (20% relative uplift)
    const conversionRate = isTest ? 0.12 : 0.10;
    const openRate = 0.8; // 80% open emails
    const clickRate = 0.15; // 15% click rate
    
    const opened = Math.random() < openRate ? 'Yes' : 'No';
    const clicked = opened === 'Yes' && Math.random() < clickRate ? 'Yes' : 'No';
    const converted = clicked === 'Yes' && Math.random() < conversionRate ? 'Yes' : 'No';
    
    // Generate random date in the last 3 months
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-06-30');
    const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
    const formattedDate = randomDate.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });

    additionalData.push([
      i.toString(),
      `Customer ${i}`,
      `C${i.toString().padStart(4, '0')}`,
      variant,
      opened,
      clicked,
      converted,
      formattedDate
    ]);
  }

  return [...sampleData, ...additionalData];
};

export const downloadSampleCSV = () => {
  const data = generateSampleData();
  const csvContent = data.map(row => row.join(',')).join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'sample-ab-test-data.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};