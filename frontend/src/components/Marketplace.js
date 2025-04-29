import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3React } from '@web3-react/core';
import { Card, Button, Row, Col, Spinner, Container, Badge, Nav, Form, InputGroup } from 'react-bootstrap';
import Notification from './Notification';
import { resolveIPFSUrl } from '../utils/pinataConfig';
import { useNotification } from '../hooks/useNotification';
import { loadBooks, handleRent } from '../services/marketplaceService';
import '../styles/Marketplace.css';

function Marketplace() {
  const { account, library, chainId } = useWeb3React();
  const { notification, showNotification, handleError, clearNotification } = useNotification();
  
  const [availableBooks, setAvailableBooks] = useState([]);
  const [rentedBooks, setRentedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rentingBookId, setRentingBookId] = useState(null);
  const [activeTab, setActiveTab] = useState('available');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('title');

  const handleLoadBooks = useCallback(async () => {
    await loadBooks({
      library,
      setAvailableBooks,
      setRentedBooks,
      setLoading,
      handleError
    });
  }, [library, chainId, account, handleError]);

  useEffect(() => {
    handleLoadBooks();
    // Refresh books every 30 seconds
    const interval = setInterval(handleLoadBooks, 30000);
    return () => clearInterval(interval);
  }, [handleLoadBooks]);

  const handleBookRent = async (bookId, deposit, dailyPrice) => {
    await handleRent({
      bookId,
      deposit,
      dailyPrice,
      library,
      account,
      setRentingBookId,
      showNotification,
      handleError,
      onSuccess: handleLoadBooks
    });
  };

  // Function to filter and sort books based on search, category, and sort option
  const getFilteredBooks = (books) => {
    // Filter by search query
    let filtered = books.filter(book => 
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (book.description && book.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Sort based on selected option
    return filtered.sort((a, b) => {
      switch (sortOption) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'author':
          return a.author.localeCompare(b.author);
        case 'priceAsc':
          return parseFloat(a.dailyPrice) - parseFloat(b.dailyPrice);
        case 'priceDesc':
          return parseFloat(b.dailyPrice) - parseFloat(a.dailyPrice);
        default:
          return 0;
      }
    });
  };

  const renderBookCard = (book, isRented = false) => (
    <Card className="book-card shadow-sm animate__animated animate__fadeIn">
      <Card.Header className={`listing-card-header ${isRented ? 'rented' : ''}`}>
        <h5 className="mb-0">
          <i className={`bi bi-${isRented ? 'hourglass-split' : 'book'} me-2`}></i>
          {book.title}
        </h5>
      </Card.Header>
      {book.coverImage && (
        <div className="book-cover-container">
          <div className="book-cover-preview">
            <img 
              src={resolveIPFSUrl(book.coverImage)} 
              alt={`Cover for ${book.title}`} 
              className="preview-image"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/500x700?text=No+Image';
              }}
            />
          </div>
          {isRented && 
            <div className="rental-badge">
              <Badge bg="warning" text="dark" className="rental-status">
                <i className="bi bi-hourglass-split me-1"></i>
                Currently Rented
              </Badge>
            </div>
          }
        </div>
      )}
      <Card.Body className="listing-card-body">
        <div className="book-author book-info-item">
          <div className="info-icon">
            <i className="bi bi-person-fill"></i>
          </div>
          <div className="info-content">
            <strong>Author</strong>
            <div>{book.author}</div>
          </div>
        </div>
        
        <div className="book-description book-info-item">
          <div className="info-icon">
            <i className="bi bi-card-text"></i>
          </div>
          <div className="info-content">
            <strong>Description</strong>
            <p>{book.description || "No description provided."}</p>
          </div>
        </div>
        
        <div className="book-pricing book-info-item">
          <div className="info-icon">
            <i className="bi bi-currency-dollar"></i>
          </div>
          <div className="info-content">
            <strong>Price</strong>
            <div>{book.dailyPrice} ETH per minute</div>
          </div>
        </div>
        
        <div className="book-deposit book-info-item">
          <div className="info-icon">
            <i className="bi bi-shield-lock-fill"></i>
          </div>
          <div className="info-content">
            <strong>Deposit</strong>
            <div>{book.deposit} ETH</div>
          </div>
        </div>
        
        <div className="book-contact book-info-item">
          <div className="info-icon">
            <i className="bi bi-envelope-fill"></i>
          </div>
          <div className="info-content">
            <strong>Contact</strong>
            <div>{book.email || "No email provided"}</div>
          </div>
        </div>
        
        {isRented && (
          <div className="book-rental-info book-info-item">
            <div className="info-icon">
              <i className="bi bi-calendar-date-fill"></i>
            </div>
            <div className="info-content">
              <strong>Rented since</strong>
              <div>{book.rentalStartTime ? book.rentalStartTime.toLocaleString() : 'Unknown'}</div>
            </div>
          </div>
        )}
        
        <Button
          variant={isRented ? "secondary" : "primary"}
          className="rent-button"
          onClick={() => !isRented && handleBookRent(book.id, book.deposit, book.dailyPrice)}
          disabled={isRented || rentingBookId === book.id}
        >
          {rentingBookId === book.id ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Renting...
            </>
          ) : isRented ? (
            <>
              <i className="bi bi-hourglass me-2"></i>
              Not Available
            </>
          ) : (
            <>
              <i className="bi bi-cart-plus me-2"></i>
              Rent Now
            </>
          )}
        </Button>
      </Card.Body>
      <Card.Footer className="listing-card-footer">
        <small>
          <i className="bi bi-person-circle me-1"></i>
          Listed by: {book.owner.substring(0, 6)}...{book.owner.substring(38)}
        </small>
      </Card.Footer>
    </Card>
  );

  const renderEmptyState = (type) => (
    <div className="empty-state animate__animated animate__fadeIn">
      <div className="empty-icon">
        <i className={`bi bi-${type === 'available' ? 'book' : 'hourglass'}`}></i>
      </div>
      <h3>No {type === 'available' ? 'Books Available' : 'Rented Books'}</h3>
      <p>There are no books {type === 'available' ? 'available for rent' : 'currently rented by other users'} at the moment.</p>
      {searchQuery && <p>Try adjusting your search criteria or clearing filters.</p>}
    </div>
  );

  // Search, filter, and sort controls
  const renderFilterControls = () => (
    <div className="filter-controls mb-4 animate__animated animate__fadeIn">
      <Row className="g-3">
        <Col lg={5} md={6}>
          <InputGroup>
            <InputGroup.Text className="search-icon">
              <i className="bi bi-search"></i>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search books by title, author or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <Button 
                variant="outline-secondary" 
                onClick={() => setSearchQuery('')}
                className="clear-search"
              >
                <i className="bi bi-x-circle"></i>
              </Button>
            )}
          </InputGroup>
        </Col>
        <Col lg={3} md={6}>
          <Form.Select 
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="sort-select"
          >
            <option value="title">Sort by Title</option>
            <option value="author">Sort by Author</option>
            <option value="priceAsc">Price (Low to High)</option>
            <option value="priceDesc">Price (High to Low)</option>
          </Form.Select>
        </Col>
      </Row>
    </div>
  );

  if (!account) {
    return (
      <div className="wallet-connect-container">
        <div className="wallet-connect-content animate__animated animate__fadeIn">
          <div className="wallet-icon-wrapper">
            <i className="bi bi-wallet2"></i>
          </div>
          <h2>Connect Your Wallet</h2>
          <p>Please connect your blockchain wallet to view available books in the marketplace.</p>
          <div className="wallet-animation">
            <div className="wallet-pulse"></div>
            <div className="wallet-pulse"></div>
            <div className="wallet-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!library) {
    return (
      <div className="wallet-connect-container">
        <div className="wallet-connect-content animate__animated animate__fadeIn">
          <div className="wallet-icon-wrapper">
            <i className="bi bi-exclamation-triangle"></i>
          </div>
          <h2>Contract Not Deployed</h2>
          <p>Please make sure you are connected to the correct network to access the Decentralized Book Marketplace.</p>
        </div>
      </div>
    );
  }

  // Filter books based on current filters
  const filteredAvailableBooks = getFilteredBooks(availableBooks);
  const filteredRentedBooks = getFilteredBooks(rentedBooks);

  return (
    <Container className="marketplace-container">
      <div className="marketplace-header animate__animated animate__fadeInDown">
        <h1>
          <span className="gradient-text">Decentralized Book Marketplace</span>
        </h1>
        <p className="text-muted">Discover and rent books from the blockchain community</p>
      </div>
      
      <Notification
        show={notification.show}
        type={notification.type}
        message={notification.message}
        onClose={clearNotification}
      />

      {loading ? (
        <div className="loading-container animate__animated animate__fadeIn">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p>Loading marketplace books...</p>
        </div>
      ) : (
        <>
          <div className="marketplace-tabs">
            <Nav variant="tabs" className="marketplace-nav" activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
              <Nav.Item>
                <Nav.Link eventKey="available" className="tab-link">
                  <div className="tab-icon">
                    <i className="bi bi-book"></i>
                  </div>
                  <div className="tab-text">
                    Available Books
                    <span className="tab-badge">{availableBooks.length}</span>
                  </div>
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="rented" className="tab-link">
                  <div className="tab-icon">
                    <i className="bi bi-hourglass-split"></i>
                  </div>
                  <div className="tab-text">
                    Rented Books
                    <span className="tab-badge">{rentedBooks.length}</span>
                  </div>
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </div>
          
          {renderFilterControls()}
          
          <div className="tab-content-container">
            <div className={`tab-pane ${activeTab === 'available' ? 'active' : ''}`}>
              {filteredAvailableBooks.length === 0 ? (
                renderEmptyState('available')
              ) : (
                <Row xs={1} md={2} lg={3} className="g-4 books-grid">
                  {filteredAvailableBooks.map((book) => (
                    <Col key={book.id}>
                      {renderBookCard(book, false)}
                    </Col>
                  ))}
                </Row>
              )}
            </div>
            
            <div className={`tab-pane ${activeTab === 'rented' ? 'active' : ''}`}>
              {filteredRentedBooks.length === 0 ? (
                renderEmptyState('rented')
              ) : (
                <Row xs={1} md={2} lg={3} className="g-4 books-grid">
                  {filteredRentedBooks.map((book) => (
                    <Col key={book.id}>
                      {renderBookCard(book, true)}
                    </Col>
                  ))}
                </Row>
              )}
            </div>
          </div>
        </>
      )}
      
      <div className="marketplace-footer">
        <div className="stats-container">
          <div className="stat-item">
            <div className="stat-icon">
              <i className="bi bi-book"></i>
            </div>
            <div className="stat-value">{availableBooks.length + rentedBooks.length}</div>
            <div className="stat-label">Total Books</div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">
              <i className="bi bi-cart-check"></i>
            </div>
            <div className="stat-value">{rentedBooks.length}</div>
            <div className="stat-label">Rented Books</div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">
              <i className="bi bi-wallet2"></i>
            </div>
            <div className="stat-value">{availableBooks.length}</div>
            <div className="stat-label">Available Books</div>
          </div>
        </div>
      </div>
    </Container>
  );
}

export default Marketplace;