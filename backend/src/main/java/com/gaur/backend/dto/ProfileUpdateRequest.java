package com.gaur.backend.dto;

public class ProfileUpdateRequest {
    private String phone;
    private String persona;
    private Boolean acceptedTerms;
    private String name;
    private String username;
    private String avatarDataUrl;
    private String firstName;
    private String lastName;
    private Boolean darkMode;
    private Boolean emailNotifications;
    private String bio;
    private String githubUrl;
    private String linkedinUrl;
    private String portfolioUrl;

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getPersona() { return persona; }
    public void setPersona(String persona) { this.persona = persona; }
    public Boolean getAcceptedTerms() { return acceptedTerms; }
    public void setAcceptedTerms(Boolean acceptedTerms) { this.acceptedTerms = acceptedTerms; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getAvatarDataUrl() { return avatarDataUrl; }
    public void setAvatarDataUrl(String avatarDataUrl) { this.avatarDataUrl = avatarDataUrl; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public Boolean getDarkMode() { return darkMode; }
    public void setDarkMode(Boolean darkMode) { this.darkMode = darkMode; }
    public Boolean getEmailNotifications() { return emailNotifications; }
    public void setEmailNotifications(Boolean emailNotifications) { this.emailNotifications = emailNotifications; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public String getGithubUrl() { return githubUrl; }
    public void setGithubUrl(String githubUrl) { this.githubUrl = githubUrl; }
    public String getLinkedinUrl() { return linkedinUrl; }
    public void setLinkedinUrl(String linkedinUrl) { this.linkedinUrl = linkedinUrl; }
    public String getPortfolioUrl() { return portfolioUrl; }
    public void setPortfolioUrl(String portfolioUrl) { this.portfolioUrl = portfolioUrl; }
}
