require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

// Initialize Google Analytics Data API v1
const analytics = google.analyticsdata({
  version: 'v1beta',
  auth: new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly']
  })
});

function siteToPropertyId(site) {
  switch (site) {
    case 'blog.codepromptfu.com':
      return process.env.GA_PROPERTY_ID_1;
    default:
      return null;
  }
}

app.get('/api/v1', async (req, res) => {
  try {
    const pagePath = req.query.page;
    const propertyId = siteToPropertyId(req.query.site) || '';
    const property = `properties/${propertyId}`;
    
    const requestBody = {
      dateRanges: [
        {
          startDate: '60daysAgo',
          endDate: 'today'
        }
      ],
      metrics: [
        {
          name: 'screenPageViews'
        },
        {
          name: 'sessions'
        }
      ],
      dimensions: [
        {
          name: 'pagePath'
        }
      ]
    };

    // If a specific page is requested, add a filter
    if (pagePath) {
      requestBody.dimensionFilter = {
        filter: {
          fieldName: 'pagePath',
          stringFilter: {
            value: pagePath,
            matchType: 'EXACT'
          }
        }
      };
    }

    const response = await analytics.properties.runReport({
      property,
      requestBody
    });

    // Format the response to be more user-friendly
    const formattedData = response.data.rows?.map(row => ({
      page: row.dimensionValues[0].value,
      pageviews: parseInt(row.metricValues[0].value, 10),
      sessions: parseInt(row.metricValues[1].value, 10)
    })) || [];

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Error fetching pageviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pageviews',
      message: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Analytics API server running on port ${port}`);
});
