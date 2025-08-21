import { useState, useEffect, useMemo } from 'react'
import { 
  DataGrid, 
  GridToolbarContainer, 
  GridToolbarFilterButton, 
  GridToolbarExport, 
  GridToolbarColumnsButton 
} from '@mui/x-data-grid'
import { Box, Typography, Button, Chip, Paper, Grid, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material'
import './App.css'

// Filter persistence
const FILTER_MODEL_KEY = 'mui-datagrid-filter-model'
const SORT_MODEL_KEY = 'mui-datagrid-sort-model'
const COLUMN_VISIBILITY_KEY = 'mui-datagrid-column-visibility'

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
        // Fix singleSelect columns that used 'equals' instead of 'is'
        if (['brand', 'category', 'status', 'country'].includes(item.field) && item.operator === 'equals') {
          return { ...item, operator: 'is' }
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

// Multi-column filter component
const MultiColumnFilter = ({ onApplyFilters, onClearFilters }) => {
  const [brandFilter, setBrandFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [priceFilter, setPriceFilter] = useState('')
  const [priceOperator, setPriceOperator] = useState('>')
  const [statusFilter, setStatusFilter] = useState('')

  const brands = ['Apple', 'Samsung', 'Sony', 'Microsoft', 'Google', 'Amazon', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Razer', 'Logitech', 'Corsair']
  const categories = ['Computers & Laptops', 'Mobile & Tablets', 'Gaming', 'Audio & Video', 'Accessories', 'Home & Kitchen', 'Office Supplies']
  const statuses = ['In Stock', 'Low Stock', 'Out of Stock', 'Pre-order']

  const handleApplyFilters = () => {
    const filters = []
    
    if (brandFilter) {
      filters.push({
        field: 'brand',
        operator: 'is',
        value: brandFilter
      })
    }
    
    if (categoryFilter) {
      filters.push({
        field: 'category',
        operator: 'is',
        value: categoryFilter
      })
    }
    
    if (priceFilter) {
      filters.push({
        field: 'price',
        operator: priceOperator,
        value: parseFloat(priceFilter)
      })
    }
    
    if (statusFilter) {
      filters.push({
        field: 'status',
        operator: 'is',
        value: statusFilter
      })
    }
    
    onApplyFilters(filters)
  }

  const handleClear = () => {
    setBrandFilter('')
    setCategoryFilter('')
    setPriceFilter('')
    setPriceOperator('>')
    setStatusFilter('')
    onClearFilters()
  }

  return (
    <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f8f9fa' }}>
      <Typography variant="h6" sx={{ mb: 2, color: '#1976d2' }}>
        🎯 Multi-Column Quick Filters
      </Typography>
      
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Brand</InputLabel>
            <Select
              value={brandFilter}
              label="Brand"
              onChange={(e) => setBrandFilter(e.target.value)}
            >
              <MenuItem value="">All Brands</MenuItem>
              {brands.map(brand => (
                <MenuItem key={brand} value={brand}>{brand}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Category"
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map(category => (
                <MenuItem key={category} value={category}>{category}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={6} sm={3} md={1}>
          <FormControl fullWidth size="small">
            <InputLabel>Price Op</InputLabel>
            <Select
              value={priceOperator}
              label="Price Op"
              onChange={(e) => setPriceOperator(e.target.value)}
            >
              <MenuItem value=">">&gt;</MenuItem>
              <MenuItem value="<">&lt;</MenuItem>
              <MenuItem value=">=">&gt;=</MenuItem>
              <MenuItem value="<=">&lt;=</MenuItem>
              <MenuItem value="=">=</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={6} sm={3} md={1.5}>
          <TextField
            fullWidth
            size="small"
            label="Price ($)"
            type="number"
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
            placeholder="100.00"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">All Status</MenuItem>
              {statuses.map(status => (
                <MenuItem key={status} value={status}>{status}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={1.5}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              onClick={handleApplyFilters}
              sx={{ minWidth: 'auto' }}
            >
              Apply
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleClear}
              sx={{ minWidth: 'auto' }}
            >
              Clear
            </Button>
          </Box>
        </Grid>
      </Grid>
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

  const handleApplyMultiColumnFilters = (filters) => {
    console.log('Applying filters:', filters)
    setFilterModel({ 
      items: filters,
      logicOperator: 'and'
    })
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

      <MultiColumnFilter 
        onApplyFilters={handleApplyMultiColumnFilters}
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
