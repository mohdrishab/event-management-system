Event Management System

Roles:

* Student
* Staff
* HoD

Main Modules:

* Event creation
* Event application
* Application approval
* Certificate upload
* Certificate approval
* Leave applications
* Dashboards
* Feature flags

Database Flow:
auth.users → users → profiles → students/staff
students → applications → events
applications → certificates
students → leave_applications
students → event_registrations

Known Issues:

* Applications not showing in dashboard
* Certificates sometimes not visible
* Login routing issues
* Some database queries not matching schema
* RLS policies may block data
