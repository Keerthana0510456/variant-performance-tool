import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TestStorage } from '@/lib/storage';
import { ABTest } from '@/types';
import { Search, Plus, Calendar, TrendingUp, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export function Dashboard() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = () => {
    const allTests = TestStorage.getAllTests();
    setTests(allTests);
  };

  const deleteTest = (testId: string) => {
    if (window.confirm('Are you sure you want to delete this test?')) {
      TestStorage.deleteTest(testId);
      loadTests();
    }
  };

  const filteredTests = tests.filter(test => {
    const matchesSearch = test.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || test.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'running': return 'warning';
      case 'completed': return 'success';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">A/B Test Dashboard</h1>
          <p className="text-muted-foreground">Manage and monitor your A/B tests</p>
        </div>
        <Button asChild>
          <Link to="/new-test">
            <Plus className="mr-2 h-4 w-4" />
            Start New Test
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tests</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tests Grid */}
      {filteredTests.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tests found</h3>
            <p className="text-muted-foreground mb-4">
              {tests.length === 0 
                ? "Get started by creating your first A/B test" 
                : "Try adjusting your search criteria"}
            </p>
            <Button asChild>
              <Link to="/new-test">Create Your First Test</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTests.map((test) => (
            <Card key={test.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-1">{test.name}</CardTitle>
                  <Badge variant={getStatusColor(test.status) as any}>
                    {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4" />
                  Created: {format(new Date(test.createdDate), 'MMM dd, yyyy')}
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Sample Size:</span> {test.sampleSize.toLocaleString()}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Duration:</span> {test.estimatedDuration} days
                  </div>
                  {test.results && (
                    <div className="text-sm">
                      <span className="font-medium">Winner:</span> {test.results.summary.winningMode}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link to={`/test/${test.id}`}>
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => deleteTest(test.id)}
                    className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}