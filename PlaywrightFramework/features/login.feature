@smoke @login
Feature: User login
  As a registered user
  I want to sign in with valid credentials
  So that I can access my dashboard

  Background:
    Given I am on the login page

  @positive
  Scenario: Successful login with standard user
    When I sign in as "standard"
    Then I should see the dashboard
    And the welcome message should contain "Welcome"

  @negative
  Scenario Outline: Failed login surfaces an error
    When I sign in with username "<user>" and password "<pass>"
    Then I should see an error message "<error>"

    Examples:
      | user      | pass      | error                       |
      | bad_user  | wrong     | Invalid username or password|
      |           | something | Username is required        |
      | std_user  |           | Password is required        |
