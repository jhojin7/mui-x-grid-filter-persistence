import { useState, useEffect, useMemo } from 'react'
import { 
  DataGrid, 
  GridToolbarContainer, 
  GridToolbarFilterButton, 
  GridToolbarExport, 
  GridToolbarColumnsButton 
} from '@mui/x-data-grid'
import { Box, Typography, Button, Chip, Paper, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material'
import './App.css'

// Filter persistence
const FILTER_MODEL_KEY = 'mui-datagrid-filter-model'
const SORT_MODEL_KEY = 'mui-datagrid-sort-model'
const COLUMN_VISIBILITY_KEY = 'mui-datagrid-column-visibility'
const CUSTOM_FILTER_STATE_KEY = 'mui-datagrid-custom-filters'

const saveToLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error(`Error saving ${key} to localStorage:`, e)
  }
}

const loadFromLocalStorage = (key, defaultValue = null) => {
  try {
    const stored = localStorage.getItem(key)
    if (!stored) return defaultValue
    
    const data = JSON.parse(stored)
    
    // Fix old filter models that might have incorrect operators
    if (key === FILTER_MODEL_KEY && data.items) {
      data.items = data.items.map(item => {
        // Fix singleSelect columns that used 'is' instead of 'equals'
        if (['brand', 'category', 'status', 'country'].includes(item.field) && item.operator === 'is') {
          return { ...item, operator: 'equals' }
        }
        return item
      })
    }
    
    return data
  } catch (e) {
    console.error(`Error loading ${key} from localStorage:`, e)
    return defaultValue
  }
}

// Data Generation
const generateProductData = (count = 500) => {
  const products = [
    "MacBook Pro", "iPhone", "iPad", "AirPods", "iMac", "Mac Mini",
    "ThinkPad", "Surface Pro", "Galaxy Tab", "Pixel Phone", "Steam Deck",
    "PlayStation 5", "Xbox Series X", "Nintendo Switch", "Gaming Monitor",
    "Mechanical Keyboard", "Gaming Mouse", "Webcam", "Microphone", "Headphones",
    "External SSD", "USB Hub", "Monitor Arm", "Standing Desk", "Office Chair",
    "Coffee Machine", "Blender", "Air Fryer", "Robot Vacuum", "Smart TV",
    "Soundbar", "Projector", "Tablet Stand", "Phone Case", "Screen Protector",
    "Power Bank", "Wireless Charger", "Car Mount", "Bluetooth Speaker", "Fitness Tracker"
  ]
  
  const categories = [
    "Computers & Laptops", 
    "Mobile & Tablets", 
    "Gaming", 
    "Audio & Video", 
    "Accessories", 
    "Home & Kitchen", 
    "Office Supplies"
  ]
  
  const brands = [
    "Apple", "Samsung", "Sony", "Microsoft", "Google", "Amazon", 
    "Dell", "HP", "Lenovo", "ASUS", "Razer", "Logitech", "Corsair"
  ]
  
  const countries = ["USA", "China", "Japan", "Germany", "South Korea", "Taiwan", "UK", "Canada"]
  
  return Array.from({ length: count }, (_, i) => {
    const id = i + 1
    const productIndex = i % products.length
    const brandIndex = Math.floor(Math.random() * brands.length)
    const categoryIndex = Math.floor(i / 71) % categories.length
    
    const basePrice = 50 + (i * 23) % 2000
    const discount = Math.random() > 0.7 ? Math.floor(Math.random() * 30) + 5 : 0
    const price = parseFloat((basePrice * (1 - discount / 100)).toFixed(2))
    
    const stock = Math.floor(Math.random() * 1000)
    const rating = parseFloat((3 + Math.random() * 2).toFixed(1))
    const reviews = Math.floor(Math.random() * 5000)
    
    const releaseYear = 2020 + (i % 5)
    const releaseMonth = i % 12
    const releaseDay = (i % 28) + 1
    const releaseDate = new Date(releaseYear, releaseMonth, releaseDay)
    
    return {
      id,
      name: `${brands[brandIndex]} ${products[productIndex]} ${Math.floor(i / 10) + 1}`,
      brand: brands[brandIndex],
      category: categories[categoryIndex],
      price,
      originalPrice: discount > 0 ? basePrice : null,
      discount,
      stock,
      status: stock > 100 ? 'In Stock' : stock > 20 ? 'Low Stock' : stock > 0 ? 'Out of Stock' : 'Pre-order',
      rating,
      reviews,
      releaseDate,
      country: countries[i % countries.length],
      isNew: i < 50,
      isFeatured: Math.random() > 0.8,
      weight: parseFloat((0.1 + Math.random() * 5).toFixed(2)),
      dimensions: `${Math.floor(10 + Math.random() * 30)}x${Math.floor(5 + Math.random() * 20)}x${Math.floor(1 + Math.random() * 10)}cm`
    }
  })
}

// Universal filter component for any column type
const UniversalFilterBuilder = ({ columns, onApplyFilters, onClearFilters }) => {
  const [filters, setFilters] = useState(() => {
    const saved = loadFromLocalStorage(CUSTOM_FILTER_STATE_KEY, { filters: [], logicOperator: 'and' })
    return saved.filters.map(f => ({ ...f, id: Date.now() + Math.random() }))
  })
  const [logicOperator, setLogicOperator] = useState(() => {
    const saved = loadFromLocalStorage(CUSTOM_FILTER_STATE_KEY, { filters: [], logicOperator: 'and' })
    return saved.logicOperator
  })

  // Save filter state to localStorage whenever it changes
  useEffect(() => {
    saveToLocalStorage(CUSTOM_FILTER_STATE_KEY, { filters, logicOperator })
  }, [filters, logicOperator])

  // Apply saved filters on component mount
  useEffect(() => {
    const savedFilters = filters.filter(f => 
      f.field && f.operator && (
        ['isEmpty', 'isNotEmpty'].includes(f.operator) || 
        (f.value !== '' && f.value !== null && f.value !== undefined)
      )
    )
    
    if (savedFilters.length > 0) {
      onApplyFilters({
        items: savedFilters.map(f => ({
          field: f.field,
          operator: f.operator,
          value: f.value
        })),
        logicOperator
      })
    }
  }, []) // Only run on mount

  // Get operators based on column type
  const getOperators = (columnType) => {
    switch (columnType) {
      case 'string':
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'equals', label: 'Equals' },
          { value: 'startsWith', label: 'Starts with' },
          { value: 'endsWith', label: 'Ends with' },
          { value: 'isEmpty', label: 'Is empty' },
          { value: 'isNotEmpty', label: 'Is not empty' }
        ]
      case 'number':
        return [
          { value: '=', label: 'Equals' },
          { value: '!=', label: 'Not equals' },
          { value: '>', label: 'Greater than' },
          { value: '>=', label: 'Greater than or equal' },
          { value: '<', label: 'Less than' },
          { value: '<=', label: 'Less than or equal' },
          { value: 'isEmpty', label: 'Is empty' },
          { value: 'isNotEmpty', label: 'Is not empty' }
        ]
      case 'date':
        return [
          { value: 'is', label: 'Is' },
          { value: 'not', label: 'Is not' },
          { value: 'after', label: 'Is after' },
          { value: 'onOrAfter', label: 'Is on or after' },
          { value: 'before', label: 'Is before' },
          { value: 'onOrBefore', label: 'Is on or before' },
          { value: 'isEmpty', label: 'Is empty' },
          { value: 'isNotEmpty', label: 'Is not empty' }
        ]
      case 'boolean':
        return [
          { value: 'is', label: 'Is' }
        ]
      case 'singleSelect':
        return [
          { value: 'equals', label: 'Is' },
          { value: '!=', label: 'Is not' }
        ]
      default:
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'equals', label: 'Equals' }
        ]
    }
  }

  // Add new filter
  const addFilter = () => {
    const newFilter = {
      id: Date.now() + Math.random(),
      field: '',
      operator: '',
      value: ''
    }
    setFilters([...filters, newFilter])
  }

  // Remove filter
  const removeFilter = (filterId) => {
    setFilters(filters.filter(f => f.id !== filterId))
  }

  // Update filter
  const updateFilter = (filterId, key, value) => {
    setFilters(filters.map(f => {
      if (f.id === filterId) {
        const updated = { ...f, [key]: value }
        // Reset operator and value when field changes
        if (key === 'field') {
          updated.operator = ''
          updated.value = ''
        }
        return updated
      }
      return f
    }))
  }

  // Get column by field name
  const getColumn = (field) => columns.find(col => col.field === field)

  // Render value input based on column type
  const renderValueInput = (filter) => {
    if (!filter.field || !filter.operator) return null

    const column = getColumn(filter.field)
    if (!column) return null

    // No value needed for these operators
    if (['isEmpty', 'isNotEmpty'].includes(filter.operator)) {
      return null
    }

    switch (column.type) {
      case 'number':
        return (
          <TextField
            size="small"
            type="number"
            value={filter.value}
            onChange={(e) => updateFilter(filter.id, 'value', parseFloat(e.target.value) || '')}
            placeholder="Enter number"
            sx={{ minWidth: 120 }}
          />
        )
      case 'date':
        return (
          <TextField
            size="small"
            type="date"
            value={filter.value}
            onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 140 }}
          />
        )
      case 'boolean':
        return (
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <Select
              value={filter.value}
              onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
            >
              <MenuItem value={true}>True</MenuItem>
              <MenuItem value={false}>False</MenuItem>
            </Select>
          </FormControl>
        )
      case 'singleSelect':
        return (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={filter.value}
              onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
            >
              {column.valueOptions?.map(option => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )
      default:
        return (
          <TextField
            size="small"
            value={filter.value}
            onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
            placeholder="Enter value"
            sx={{ minWidth: 120 }}
          />
        )
    }
  }

  // Apply filters
  const handleApplyFilters = () => {
    const validFilters = filters.filter(f => 
      f.field && f.operator && (
        ['isEmpty', 'isNotEmpty'].includes(f.operator) || 
        (f.value !== '' && f.value !== null && f.value !== undefined)
      )
    )
    
    onApplyFilters({
      items: validFilters.map(f => ({
        field: f.field,
        operator: f.operator,
        value: f.value
      })),
      logicOperator
    })
  }

  // Clear all filters
  const handleClearAll = () => {
    setFilters([])
    setLogicOperator('and')
    saveToLocalStorage(CUSTOM_FILTER_STATE_KEY, { filters: [], logicOperator: 'and' })
    onClearFilters()
  }

  return (
    <Paper sx={{ p: 3, mb: 2, backgroundColor: '#f8f9fa' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ color: '#1976d2' }}>
          🎯 Universal Filter Builder
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={addFilter}
          >
            + Add Filter
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleApplyFilters}
            disabled={filters.length === 0}
          >
            Apply Filters ({filters.filter(f => f.field && f.operator).length})
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={handleClearAll}
          >
            Clear All
          </Button>
        </Box>
      </Box>

      {filters.length > 1 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Logic Operator:</Typography>
          <FormControl size="small">
            <Select
              value={logicOperator}
              onChange={(e) => setLogicOperator(e.target.value)}
            >
              <MenuItem value="and">AND (all conditions must match)</MenuItem>
              <MenuItem value="or">OR (any condition can match)</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}

      {filters.length === 0 && (
        <Box sx={{ 
          textAlign: 'center', 
          py: 4, 
          color: '#666',
          border: '2px dashed #ddd',
          borderRadius: 1
        }}>
          <Typography>Click "Add Filter" to start building your filter conditions</Typography>
        </Box>
      )}

      {filters.map((filter, index) => {
        const column = getColumn(filter.field)
        const operators = column ? getOperators(column.type) : []

        return (
          <Box key={filter.id} sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2, 
            mb: 2,
            p: 2,
            backgroundColor: 'white',
            borderRadius: 1,
            border: '1px solid #e0e0e0'
          }}>
            {index > 0 && (
              <Chip 
                label={logicOperator.toUpperCase()} 
                size="small" 
                color="primary"
                sx={{ minWidth: 50 }}
              />
            )}

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Column</InputLabel>
              <Select
                value={filter.field}
                label="Column"
                onChange={(e) => updateFilter(filter.id, 'field', e.target.value)}
              >
                {columns.filter(col => col.filterable !== false).map(col => (
                  <MenuItem key={col.field} value={col.field}>
                    {col.headerName || col.field}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Operator</InputLabel>
              <Select
                value={filter.operator}
                label="Operator"
                onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
                disabled={!filter.field}
              >
                {operators.map(op => (
                  <MenuItem key={op.value} value={op.value}>
                    {op.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {renderValueInput(filter)}

            <Button
              variant="outlined"
              size="small"
              color="error"
              onClick={() => removeFilter(filter.id)}
              sx={{ minWidth: 'auto', px: 1 }}
            >
              ✕
            </Button>
          </Box>
        )
      })}
    </Paper>
  )
}

// Custom toolbar with clear filters button
const CustomToolbar = ({ onClearFilters }) => {
  return (
    <GridToolbarContainer sx={{ gap: 1, p: 1 }}>
      <GridToolbarFilterButton />
      <GridToolbarColumnsButton />
      <GridToolbarExport />
      <Button
        size="small"
        variant="outlined"
        onClick={onClearFilters}
        sx={{ ml: 1 }}
      >
        Clear All Filters
      </Button>
    </GridToolbarContainer>
  )
}

function App() {
  const [rows, setRows] = useState([])
  const [filterModel, setFilterModel] = useState(() => 
    loadFromLocalStorage(FILTER_MODEL_KEY, { items: [] })
  )
  const [sortModel, setSortModel] = useState(() => 
    loadFromLocalStorage(SORT_MODEL_KEY, [])
  )
  const [columnVisibilityModel, setColumnVisibilityModel] = useState(() =>
    loadFromLocalStorage(COLUMN_VISIBILITY_KEY, {})
  )

  // Load data on mount
  useEffect(() => {
    const data = generateProductData(500)
    setRows(data)
  }, [])

  // Save models to localStorage when they change
  useEffect(() => {
    saveToLocalStorage(FILTER_MODEL_KEY, filterModel)
  }, [filterModel])

  useEffect(() => {
    saveToLocalStorage(SORT_MODEL_KEY, sortModel)
  }, [sortModel])

  useEffect(() => {
    saveToLocalStorage(COLUMN_VISIBILITY_KEY, columnVisibilityModel)
  }, [columnVisibilityModel])

  const handleClearFilters = () => {
    setFilterModel({ items: [] })
  }

  const handleApplyUniversalFilters = (filterModel) => {
    console.log('Applying filters:', filterModel)
    setFilterModel(filterModel)
  }

  // Column definitions
  const columns = useMemo(() => [
    { 
      field: 'id', 
      headerName: 'ID', 
      width: 70,
      type: 'number'
    },
    { 
      field: 'name', 
      headerName: 'Product Name', 
      width: 250,
      type: 'string'
    },
    { 
      field: 'brand', 
      headerName: 'Brand', 
      width: 120,
      type: 'singleSelect',
      valueOptions: ['Apple', 'Samsung', 'Sony', 'Microsoft', 'Google', 'Amazon', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Razer', 'Logitech', 'Corsair']
    },
    { 
      field: 'category', 
      headerName: 'Category', 
      width: 180,
      type: 'singleSelect',
      valueOptions: ['Computers & Laptops', 'Mobile & Tablets', 'Gaming', 'Audio & Video', 'Accessories', 'Home & Kitchen', 'Office Supplies']
    },
    { 
      field: 'price', 
      headerName: 'Price ($)', 
      width: 120,
      type: 'number',
      valueFormatter: (value) => `$${value.toFixed(2)}`
    },
    { 
      field: 'discount', 
      headerName: 'Discount (%)', 
      width: 130,
      type: 'number',
      renderCell: (params) => {
        if (params.value > 0) {
          return (
            <Chip 
              label={`${params.value}% OFF`} 
              color="error" 
              size="small" 
            />
          )
        }
        return null
      }
    },
    { 
      field: 'stock', 
      headerName: 'Stock', 
      width: 100,
      type: 'number'
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120,
      type: 'singleSelect',
      valueOptions: ['In Stock', 'Low Stock', 'Out of Stock', 'Pre-order'],
      renderCell: (params) => {
        const colorMap = {
          'In Stock': 'success',
          'Low Stock': 'warning', 
          'Out of Stock': 'error',
          'Pre-order': 'info'
        }
        return (
          <Chip 
            label={params.value} 
            color={colorMap[params.value] || 'default'}
            size="small" 
          />
        )
      }
    },
    { 
      field: 'rating', 
      headerName: 'Rating', 
      width: 100,
      type: 'number',
      valueFormatter: (value) => `★ ${value}`
    },
    { 
      field: 'reviews', 
      headerName: 'Reviews', 
      width: 100,
      type: 'number'
    },
    { 
      field: 'releaseDate', 
      headerName: 'Release Date', 
      width: 140,
      type: 'date'
    },
    { 
      field: 'country', 
      headerName: 'Origin', 
      width: 120,
      type: 'singleSelect',
      valueOptions: ['USA', 'China', 'Japan', 'Germany', 'South Korea', 'Taiwan', 'UK', 'Canada']
    },
    { 
      field: 'weight', 
      headerName: 'Weight (kg)', 
      width: 120,
      type: 'number'
    },
    { 
      field: 'isNew', 
      headerName: 'New', 
      width: 80,
      type: 'boolean',
      renderCell: (params) => {
        return params.value ? <Chip label="NEW" color="primary" size="small" /> : null
      }
    },
    { 
      field: 'isFeatured', 
      headerName: 'Featured', 
      width: 100,
      type: 'boolean'
    }
  ], [])

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Typography
        variant="h3"
        component="h1"
        gutterBottom
        sx={{ textAlign: 'center', mb: 1, fontWeight: 700, color: '#1976d2' }}
      >
        MUI X DataGrid - Advanced Filtering Demo
      </Typography>
      
      <Typography
        variant="h6"
        sx={{ textAlign: 'center', mb: 4, color: '#666' }}
      >
        Professional data grid with persistent filters, sorting, and column management
      </Typography>

      <UniversalFilterBuilder 
        columns={columns}
        onApplyFilters={handleApplyUniversalFilters}
        onClearFilters={handleClearFilters}
      />

      <Box sx={{ height: 700, width: '100%', backgroundColor: 'white', borderRadius: 2 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          filterModel={filterModel}
          sortModel={sortModel}
          columnVisibilityModel={columnVisibilityModel}
          onFilterModelChange={setFilterModel}
          onSortModelChange={setSortModel}
          onColumnVisibilityModelChange={setColumnVisibilityModel}
          slots={{
            toolbar: CustomToolbar
          }}
          slotProps={{
            toolbar: {
              onClearFilters: handleClearFilters
            }
          }}
          initialState={{
            pagination: { 
              paginationModel: { pageSize: 25 } 
            }
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell:hover': {
              backgroundColor: '#f0f7ff'
            }
          }}
        />
      </Box>

      <Box sx={{ 
        mt: 3, 
        p: 2, 
        backgroundColor: '#dbeafe', 
        border: '1px solid #93c5fd', 
        borderRadius: 1,
        color: '#1e40af'
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          🚀 DataGrid Features Demonstrated:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
          <li>Advanced multi-column filtering with various operators (contains, equals, starts with, etc.)</li>
          <li>Persistent filter state - filters are saved to localStorage and restored on page reload</li>
          <li>Column sorting with persistent sort state</li>
          <li>Column show/hide functionality with state persistence</li>
          <li>Data export (CSV, Print) capabilities</li>
          <li>Multiple data types: string, number, boolean, date, single-select</li>
          <li>Custom cell rendering (chips for status, ratings, discounts)</li>
          <li>Responsive pagination with customizable page sizes</li>
        </ul>
      </Box>
    </Box>
  )
}

export default App
