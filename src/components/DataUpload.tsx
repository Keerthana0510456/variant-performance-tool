import React, { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TestStorage } from '@/lib/storage';
import { TestData } from '@/types';
import { Upload, FileText, CheckCircle, ArrowRight, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { generateSampleData, downloadSampleCSV } from '@/lib/sampleData';

interface DataUploadProps {
  testId?: string;
}

export function DataUpload({ testId }: DataUploadProps) {
  const navigate = useNavigate();
  const params = useParams();
  const finalTestId = testId || params.testId;
  const { toast } = useToast();

  const [dragOver, setDragOver] = useState(false);
  const [uploadedData, setUploadedData] = useState<TestData | null>(null);
  const [mappings, setMappings] = useState({
    variantColumn: '',
    conversionColumn: '',
    customerIdColumn: '',
    dateColumn: '',
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Error",
        description: "Please upload a CSV file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "Error", 
        description: "File size must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    Papa.parse(file, {
      header: false,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast({
            title: "Error",
            description: "Failed to parse CSV file",
            variant: "destructive"
          });
          return;
        }

        const [headerRow, ...dataRows] = results.data as string[][];
        
        const testData: TestData = {
          fileName: file.name,
          columns: headerRow,
          rows: dataRows.slice(0, 1000), // Limit preview to first 1000 rows
          mappings: {}
        };

        setUploadedData(testData);
        
        // Auto-detect common column mappings
        const lowerHeaders = headerRow.map(h => h.toLowerCase());
        
        const variantIndex = lowerHeaders.findIndex(h => 
          h.includes('variant') || h.includes('group') || h.includes('type')
        );
        const conversionIndex = lowerHeaders.findIndex(h => 
          h.includes('converted') || h.includes('conversion') || h.includes('click')
        );
        const customerIndex = lowerHeaders.findIndex(h => 
          h.includes('customer') || h.includes('user') || h.includes('id')
        );
        const dateIndex = lowerHeaders.findIndex(h => 
          h.includes('date') || h.includes('time')
        );

        setMappings({
          variantColumn: variantIndex >= 0 ? headerRow[variantIndex] : '',
          conversionColumn: conversionIndex >= 0 ? headerRow[conversionIndex] : '',
          customerIdColumn: customerIndex >= 0 ? headerRow[customerIndex] : '',
          dateColumn: dateIndex >= 0 ? headerRow[dateIndex] : '',
        });

        toast({
          title: "Success",
          description: "File uploaded successfully"
        });
      },
      error: () => {
        toast({
          title: "Error",
          description: "Failed to upload file",
          variant: "destructive"
        });
      }
    });
  };

  const handleSave = () => {
    if (!uploadedData || !finalTestId) return;
    
    if (!mappings.variantColumn || !mappings.conversionColumn) {
      toast({
        title: "Error",
        description: "Please map the variant and conversion columns",
        variant: "destructive"
      });
      return;
    }

    const test = TestStorage.getTest(finalTestId);
    if (!test) {
      toast({
        title: "Error",
        description: "Test not found",
        variant: "destructive"
      });
      return;
    }

    const updatedTest = {
      ...test,
      data: {
        ...uploadedData,
        mappings
      },
      status: 'running' as const
    };

    TestStorage.saveTest(updatedTest);
    
    toast({
      title: "Success",
      description: "Data uploaded and mapped successfully"
    });

    navigate(`/test/${finalTestId}`);
  };

  const loadSampleData = () => {
    const sampleData = generateSampleData();
    const [headerRow, ...dataRows] = sampleData;
    
    const testData: TestData = {
      fileName: 'sample-ab-test-data.csv',
      columns: headerRow,
      rows: dataRows,
      mappings: {}
    };

    setUploadedData(testData);
    
    // Auto-map sample data columns
    setMappings({
      variantColumn: 'Variant Type',
      conversionColumn: 'Converted',
      customerIdColumn: 'Customer ID',
      dateColumn: 'Date',
    });

    toast({
      title: "Success",
      description: "Sample data loaded successfully"
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload Test Data</h1>
        <p className="text-muted-foreground">Upload your A/B test dataset and configure column mappings</p>
      </div>

      {!uploadedData ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Drop your CSV file here</h3>
              <p className="text-muted-foreground mb-4">or click to browse</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Button asChild>
                <label htmlFor="file-upload" className="cursor-pointer">
                  Select File
                </label>
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Maximum file size: 5MB
              </p>
            </div>
            
            <div className="flex gap-4 justify-center pt-4 border-t">
              <Button variant="outline" onClick={loadSampleData}>
                Use Sample Data
              </Button>
              <Button variant="outline" onClick={downloadSampleCSV}>
                <Download className="mr-2 h-4 w-4" />
                Download Sample CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* File Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                {uploadedData.fileName}
                <CheckCircle className="ml-2 h-5 w-5 text-success" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {uploadedData.rows.length.toLocaleString()} rows, {uploadedData.columns.length} columns
              </p>
            </CardContent>
          </Card>

          {/* Column Mapping */}
          <Card>
            <CardHeader>
              <CardTitle>Column Mapping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Variant Column *</Label>
                  <Select value={mappings.variantColumn} onValueChange={(value) => 
                    setMappings(prev => ({ ...prev, variantColumn: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select variant column" />
                    </SelectTrigger>
                    <SelectContent>
                      {uploadedData.columns.map((col, index) => (
                        <SelectItem key={index} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Conversion Column *</Label>
                  <Select value={mappings.conversionColumn} onValueChange={(value) => 
                    setMappings(prev => ({ ...prev, conversionColumn: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select conversion column" />
                    </SelectTrigger>
                    <SelectContent>
                      {uploadedData.columns.map((col, index) => (
                        <SelectItem key={index} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Customer ID Column</Label>
                  <Select value={mappings.customerIdColumn} onValueChange={(value) => 
                    setMappings(prev => ({ ...prev, customerIdColumn: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer ID column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {uploadedData.columns.map((col, index) => (
                        <SelectItem key={index} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Date Column</Label>
                  <Select value={mappings.dateColumn} onValueChange={(value) => 
                    setMappings(prev => ({ ...prev, dateColumn: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select date column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {uploadedData.columns.map((col, index) => (
                        <SelectItem key={index} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Data Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {uploadedData.columns.map((col, index) => (
                        <TableHead key={index} className="whitespace-nowrap">
                          {col}
                          {mappings.variantColumn === col && (
                            <span className="ml-1 text-xs bg-primary text-primary-foreground px-1 rounded">
                              Variant
                            </span>
                          )}
                          {mappings.conversionColumn === col && (
                            <span className="ml-1 text-xs bg-accent text-accent-foreground px-1 rounded">
                              Conversion
                            </span>
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadedData.rows.slice(0, 10).map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <TableCell key={cellIndex} className="whitespace-nowrap">
                            {cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {uploadedData.rows.length > 10 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Showing first 10 rows of {uploadedData.rows.length.toLocaleString()} total rows
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button onClick={handleSave}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Continue to Analysis
            </Button>
            <Button variant="outline" onClick={() => setUploadedData(null)}>
              Upload Different File
            </Button>
          </div>
        </>
      )}
    </div>
  );
}