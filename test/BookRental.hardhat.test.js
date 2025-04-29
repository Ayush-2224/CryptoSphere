const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("BookRental Contract", function () {
  let BookRental;
  let bookRental;
  let owner;
  let renter;
  let otherUser;

  // Common test parameters
  const title = "The Great Gatsby";
  const author = "F. Scott Fitzgerald";
  const description = "A classic American novel";
  const coverImage = "https://example.com/cover.jpg";
  const email = "owner@example.com";
  let dailyPrice;
  let deposit;

  beforeEach(async function () {
    // Deploy a fresh contract for each test
    [owner, renter, otherUser] = await ethers.getSigners();
    
    // Deploy the contract
    BookRental = await ethers.getContractFactory("BookRental");
    bookRental = await BookRental.deploy();
    
    // Convert values to wei
    dailyPrice = ethers.parseEther("0.01");
    deposit = ethers.parseEther("0.1");
    
    // List a book for each test to use
    await bookRental.listItem(
      title, 
      author, 
      description, 
      coverImage,
      email,
      dailyPrice, 
      deposit
    );
  });

  describe("Basic Book Rental Functionality", function () {
    it("Should allow listing a book", async function () {
      // List another book to test
      await bookRental.listItem(
        "Second Book", 
        "Another Author", 
        "Another Description", 
        "https://example.com/cover2.jpg",
        "second@example.com",
        dailyPrice, 
        deposit
      );
      
      // Get book count - should be 2 since beforeEach already created one
      const count = await bookRental.bookCount();
      expect(count).to.equal(2);
      
      // Get book details of the second book
      const book = await bookRental.getBook(1);
      expect(book.title).to.equal("Second Book");
      expect(book.author).to.equal("Another Author");
      expect(book.description).to.equal("Another Description");
      expect(book.coverImage).to.equal("https://example.com/cover2.jpg");
      expect(book.email).to.equal("second@example.com");
      expect(book.dailyPrice).to.equal(dailyPrice);
      expect(book.deposit).to.equal(deposit);
      expect(book.owner).to.equal(owner.address);
      expect(book.isAvailable).to.be.true;
    });

    it("Should reject listing with empty title", async function () {
      await expect(
        bookRental.listItem("", author, description, coverImage, email, dailyPrice, deposit)
      ).to.be.revertedWith("Title cannot be empty");
    });

    it("Should reject listing with empty author", async function () {
      await expect(
        bookRental.listItem(title, "", description, coverImage, email, dailyPrice, deposit)
      ).to.be.revertedWith("Author cannot be empty");
    });

    it("Should allow renting a book", async function () {
      // Calculate payment (price + deposit)
      const payment = ethers.parseEther("0.11"); // 0.01 + 0.1
      
      // Rent the book
      await bookRental.connect(renter).rentItem(0, { value: payment });
      
      // Check book status
      const book = await bookRental.getBook(0);
      expect(book.isAvailable).to.be.false;
      expect(book.renter).to.equal(renter.address);
    });

    it("Should reject renting an unavailable book", async function () {
      const payment = ethers.parseEther("0.11");
      
      // First rent the book
      await bookRental.connect(renter).rentItem(0, { value: payment });
      
      // Now try to rent it again
      await expect(
        bookRental.connect(otherUser).rentItem(0, { value: payment })
      ).to.be.revertedWith("Book is not available");
    });

    it("Should reject insufficient payment", async function () {
      // Try to rent with insufficient payment
      const insufficientPayment = ethers.parseEther("0.09"); // Less than 0.11
      
      await expect(
        bookRental.connect(renter).rentItem(0, { value: insufficientPayment })
      ).to.be.revertedWith(/Insufficient payment/); // Use regex to match partial string
    });

    it("Should reject renting by the owner", async function () {
      const payment = ethers.parseEther("0.11");
      
      await expect(
        bookRental.rentItem(0, { value: payment })
      ).to.be.revertedWith("Cannot rent your own book");
    });

    it("Should allow returning a book", async function () {
      // Calculate payment (price + deposit)
      const payment = ethers.parseEther("0.11");
      
      // First rent the book
      await bookRental.connect(renter).rentItem(0, { value: payment });
      
      // Then return the book
      await bookRental.connect(renter).returnItem(0);
      
      // Get book details to verify state
      const book = await bookRental.getBook(0);
      expect(book.isAvailable).to.be.true;
      expect(book.renter).to.equal("0x0000000000000000000000000000000000000000");
    });
  });

  // RETURN TESTS - Refund Calculations
  it("Should calculate refunds accurately for different rental durations", async function() {
    const payment = ethers.parseEther("0.11"); // price + deposit
    
    // Rent the book
    await bookRental.connect(renter).rentItem(0, { value: payment });
    
    // Check initial balances
    const renterBalanceBefore = await ethers.provider.getBalance(renter.address);
    
    // Simulate time passing (e.g., 3 minutes)
    await network.provider.send("evm_increaseTime", [3 * 60]); // 3 minutes in seconds
    await network.provider.send("evm_mine");
    
    // Return the book
    const tx = await bookRental.connect(renter).returnItem(0);
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    
    // Check final balances
    const renterBalanceAfter = await ethers.provider.getBalance(renter.address);
    
    // Calculate expected refund (deposit - 3 minutes of rental)
    // Using BigInt for calculations instead of .mul
    const expectedRentalFee = BigInt(dailyPrice) * BigInt(3); // 3 minutes at dailyPrice per minute
    const expectedRefund = BigInt(deposit) - expectedRentalFee;
    
    // Account for gas in calculation
    const actualChange = renterBalanceAfter - renterBalanceBefore + gasUsed;
    
    // Verify the refund is close to what we expect (within 0.0001 ETH)
    const tolerance = ethers.parseEther("0.0001");
    expect(actualChange).to.be.closeTo(expectedRefund, tolerance);
  });

  // EDGE CASES - Additional Payments
  it("Should require additional payment when rental fees exceed deposit", async function() {
    const payment = ethers.parseEther("0.11"); // price + deposit
    
    // Rent the book
    await bookRental.connect(renter).rentItem(0, { value: payment });
    
    // Simulate time passing (e.g., 12 minutes, which makes fees > deposit)
    await network.provider.send("evm_increaseTime", [12 * 60]); // 12 minutes in seconds
    await network.provider.send("evm_mine");
    
    // Calculate expected additional payment using BigInt
    const rentalFees = BigInt(dailyPrice) * BigInt(12); // 12 minutes at dailyPrice per minute
    const additionalPayment = rentalFees - BigInt(deposit);
    
    // Attempt to return without additional payment should fail
    await expect(
      bookRental.connect(renter).returnItem(0)
    ).to.be.reverted;
    
    // Return with correct additional payment should succeed
    await expect(
      bookRental.connect(renter).returnItem(0, { value: additionalPayment })
    ).to.not.be.reverted;
  });

  // EDGE CASE - Unauthorized Return
  it("Should reject returns from non-renters", async function() {
    const payment = ethers.parseEther("0.11"); // price + deposit
    
    // Rent the book
    await bookRental.connect(renter).rentItem(0, { value: payment });
    
    // Try to return as someone else (not the renter)
    await expect(
      bookRental.connect(otherUser).returnItem(0)
    ).to.be.revertedWith("Only renter can return the book");
  });
}); 